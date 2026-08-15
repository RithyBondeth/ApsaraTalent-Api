import {
  scopeSetSimilarityScore,
  jobTitleSimilarityScore,
  parseEmbedding,
} from '@app/common/embedding/embedding.util';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import {
  BLOCK_NOT_EXISTS,
  RECO_MIN_SCORE,
  RECO_POOL_CAP,
  RECO_SCOPE_ANN_K,
  clampRecoLimit,
  extractKeywords,
  extractYears,
  normalizeDegree,
  vectorCentroid,
} from '../utils/recommendations-scoring.util';
import { generateListKey } from '@app/common/redis/redis-keys.util';
import {
  getJobSkillNames,
  normalizeSkillName,
} from '@app/common/utils/skill.util';
import { RecommendationSupportService } from './recommendation-support.service';
import {
  CompanyRecommendationsDTO,
  EmployeeResponseDTO,
} from '@app/contracts/dtos/user';
import { ICompanyRecommendationsService } from '@app/contracts/interfaces/service/user-service.interface';

/**
 * Employees recommended to a company: the mirror of the employee-side feed,
 * scoring candidates against the company's open positions.
 */
@Injectable()
export class CompanyRecommendationsService implements ICompanyRecommendationsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepository: Repository<JobMatching>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    private readonly support: RecommendationSupportService,
  ) {}

  async getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    const { companyId, requesterId } = companyRecommendationsDTO;
    const take = clampRecoLimit(companyRecommendationsDTO.limit);

    const hasBlocks = requesterId
      ? await this.support.requesterHasBlocks(requesterId)
      : false;

    const cacheKey = generateListKey('company-recommendations', {
      companyId,
      limit: take,
    });

    if (!hasBlocks) {
      const cached = await this.redisService.get<any[]>(cacheKey);
      if (cached) {
        this.logger.info(`Company ${companyId} recommendations cache HIT`);
        return cached;
      }
    }

    this.logger.info(`Company ${companyId} recommendations cache MISS`);

    try {
      // 1. Load company with career scopes and full open position requirements.
      //    Include embeddings for semantic Factor 1 (career scopes) and
      //    Factor 3 (job title embeddings for open positions).
      const companyUser = await this.userRepository
        .createQueryBuilder('user')
        // Only user.id and the joined company are read; without this the
        // default selection ships password, refreshToken and otpCode too.
        .select(['user.id'])
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'cmpCareerScopes')
        .addSelect('cmpCareerScopes.embedding')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .addSelect('openPositions.titleEmbedding')
        .where('company.id = :companyId', { companyId })
        .getOne();

      const company = companyUser?.company ?? null;
      const jobs = company?.openPositions ?? [];

      // Aggregate required skills across all open positions
      const allRequiredSkills = new Set<string>();
      for (const job of jobs) {
        getJobSkillNames(job)
          .map(normalizeSkillName)
          .filter(Boolean)
          .forEach((skill) => allRequiredSkills.add(skill));
      }

      // Highest education required across all jobs
      const maxRequiredDegree = Math.max(
        0,
        ...jobs.map((j) => normalizeDegree(j.educationRequired ?? '')),
      );

      // Minimum years required across all jobs (take lowest so more candidates qualify)
      const minRequiredYears = Math.min(
        ...jobs
          .map((j) => extractYears(j.experienceRequired ?? ''))
          .filter((y) => y > 0),
        999,
      );

      // 2. Get employee IDs the company has already liked — read the FK column
      //    directly instead of hydrating each JobMatching + its employee.
      const likedRows = await this.jobMatchingRepository
        .createQueryBuilder('jm')
        .select('jm."employeeId"', 'employeeId')
        .where('jm."companyId" = :companyId', { companyId })
        .andWhere('jm."companyLiked" = true')
        .getRawMany<{ employeeId: string }>();
      const likedEmployeeIds = likedRows
        .map((r) => r.employeeId)
        .filter(Boolean);

      // 3. Candidate pool (BOUNDED — retrieve-then-rerank).
      //    Use the pgvector HNSW index to find the employees whose career scopes
      //    are semantically nearest the company, then top up with a broad capped
      //    pool so recall holds when scopes aren't tagged. Scoring re-ranks this
      //    bounded set; MIN_SCORE drops the unrelated. Replaces the full scan.
      const cmpScopeEmbeddings = (company?.careerScopes ?? [])
        .map((s) => parseEmbedding((s as any).embedding))
        .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
      const queryVec = vectorCentroid(cmpScopeEmbeddings);

      let userIds: string[] = [];

      if (queryVec) {
        const scopeIds = await this.support.nearestScopeIds(
          queryVec,
          RECO_SCOPE_ANN_K,
        );
        if (scopeIds.length > 0) {
          const annQb = this.userRepository
            .createQueryBuilder('user')
            .select('user.id', 'userId')
            .innerJoin('user.employee', 'employee')
            .innerJoin('employee.careerScopes', 'cs')
            .where('cs.id IN (:...scopeIds)', { scopeIds })
            .groupBy('user.id')
            .limit(RECO_POOL_CAP);
          if (likedEmployeeIds.length > 0) {
            annQb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
              likedEmployeeIds,
            });
          }
          if (requesterId) {
            annQb.andWhere(BLOCK_NOT_EXISTS, {
              reqId: requesterId,
            });
          }
          userIds = (await annQb.getRawMany<{ userId: string }>()).map(
            (r) => r.userId,
          );
        }
      }

      if (userIds.length < RECO_POOL_CAP) {
        const broadQb = this.userRepository
          .createQueryBuilder('user')
          .select('user.id', 'userId')
          .innerJoin('user.employee', 'employee')
          .groupBy('user.id')
          .limit(RECO_POOL_CAP - userIds.length);
        if (likedEmployeeIds.length > 0) {
          broadQb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
            likedEmployeeIds,
          });
        }
        if (userIds.length > 0) {
          broadQb.andWhere('user.id NOT IN (:...have)', { have: userIds });
        }
        if (requesterId) {
          broadQb.andWhere(BLOCK_NOT_EXISTS, {
            reqId: requesterId,
          });
        }
        const more = (await broadQb.getRawMany<{ userId: string }>()).map(
          (r) => r.userId,
        );
        userIds = [...userIds, ...more];
      }

      if (userIds.length === 0) return [];

      // 4. Hydrate the bounded pool for scoring WITHOUT a cartesian product.
      //    Each profile collection is loaded in its own single-collection query
      //    (so embeddings/rows aren't multiplied across a multi-join) and then
      //    stitched back onto the base employee by user id.
      const baseUsers = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id'])
        .innerJoinAndSelect('user.employee', 'employee')
        .addSelect('employee.jobEmbedding')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      const [scopeUsers, skillUsers, expUsers, eduUsers] = await Promise.all([
        this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.careerScopes', 'careerScopes')
          .addSelect('careerScopes.embedding')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.skills', 'skills')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.experiences', 'experiences')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.educations', 'educations')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
      ]);

      const byUserId = new Map(baseUsers.map((u) => [u.id, u]));
      for (const u of scopeUsers) {
        const t = byUserId.get(u.id);
        if (t?.employee && u.employee) {
          t.employee.careerScopes = u.employee.careerScopes ?? [];
        }
      }
      for (const u of skillUsers) {
        const t = byUserId.get(u.id);
        if (t?.employee && u.employee) {
          t.employee.skills = u.employee.skills ?? [];
        }
      }
      for (const u of expUsers) {
        const t = byUserId.get(u.id);
        if (t?.employee && u.employee) {
          t.employee.experiences = u.employee.experiences ?? [];
        }
      }
      for (const u of eduUsers) {
        const t = byUserId.get(u.id);
        if (t?.employee && u.employee) {
          t.employee.educations = u.employee.educations ?? [];
        }
      }
      const users = baseUsers.filter((u) => u.employee);

      // Build text corpus from all job titles + descriptions + skills for content matching
      const jobTextCorpus = jobs
        .map(
          (j) =>
            `${j.title ?? ''} ${j.description ?? ''} ${getJobSkillNames(j).join(' ')}`,
        )
        .join(' ')
        .toLowerCase();
      const jobTitleWords = jobs.flatMap((j) =>
        (j.title ?? '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );

      // 5. Multi-factor weighted scoring (max 100 pts)
      //    Factor 1: Career scope overlap        0–35  (field match)
      //    Factor 2: Skill match ratio            0–30  (specific skill fit)
      //    Factor 3: Job title/experience match   0–20  (role relevance)
      //    Factor 4: Description content match   0–10  (context fit)
      //    Factor 5: Location match               0–5
      //    Education/Experience: bonus only when BOTH sides have data
      const scored = users.map((user) => {
        const emp = user.employee;
        let score = 0;

        // Factor 1: Career scope semantic similarity (0–35)
        // Uses pgvector cosine similarity so "Full Stack Development" ↔
        // "Backend Developer" ↔ "Software Engineer" all score correctly.
        // Falls back to exact ID overlap when embeddings are unavailable.
        score += scopeSetSimilarityScore(
          company?.careerScopes ?? [],
          emp.careerScopes ?? [],
          35,
        );

        // Factor 2: Skill match ratio — how many required skills the employee has (0–30)
        const empSkillNames = (emp.skills ?? []).map((s) =>
          s.name.toLowerCase().trim(),
        );
        if (allRequiredSkills.size > 0 && empSkillNames.length > 0) {
          const matched = [...allRequiredSkills].filter((s) =>
            empSkillNames.includes(s),
          ).length;
          score += (matched / allRequiredSkills.size) * 30;
        }

        // Factor 3: Job title semantic match (0–20)
        // Uses pgvector cosine similarity between employee's job title/position
        // and the company's open position titles.
        // Falls back to keyword overlap when embeddings are missing.
        const empJobEmbeddingCandidate = parseEmbedding(
          (emp as any)?.jobEmbedding,
        );
        if (empJobEmbeddingCandidate) {
          score += jobTitleSimilarityScore(
            empJobEmbeddingCandidate,
            jobs as any[],
            20,
          );
        } else {
          // Keyword fallback
          const allEmpTitles = [
            (emp.job ?? '').toLowerCase(),
            ...(emp.experiences ?? []).map((e) =>
              (e.title ?? '').toLowerCase(),
            ),
          ].filter(Boolean);
          if (allEmpTitles.length > 0 && jobTitleWords.length > 0) {
            const empTitleAllWords = allEmpTitles.flatMap((t) =>
              t.split(/\s+/).filter((w) => w.length > 3),
            );
            const matched = empTitleAllWords.filter((w) =>
              jobTitleWords.includes(w),
            ).length;
            const ratio = Math.min(
              1,
              matched / Math.max(jobTitleWords.length, empTitleAllWords.length),
            );
            score += ratio * 20;
          }
        }

        // Factor 4: Description / profile content match (0–10)
        const empDescWords = extractKeywords(emp.description ?? '');
        if (empDescWords.length > 0 && jobTextCorpus) {
          const matched = empDescWords.filter((w) =>
            jobTextCorpus.includes(w),
          ).length;
          score += (matched / empDescWords.length) * 10;
        }

        // Factor 5: Location match (0–5)
        if (
          emp.location &&
          company?.location &&
          emp.location.toLowerCase().trim() ===
            company.location.toLowerCase().trim()
        ) {
          score += 5;
        }

        // Education bonus: only when BOTH employee has education AND job specifies a requirement
        const empMaxDegree = Math.max(
          0,
          ...(emp.educations ?? []).map((e) => normalizeDegree(e.degree)),
        );
        if (empMaxDegree > 0 && maxRequiredDegree > 0) {
          if (empMaxDegree >= maxRequiredDegree) score += 5;
          else if (empMaxDegree === maxRequiredDegree - 1) score += 2;
        }

        // Experience bonus: only when BOTH employee has years stated AND job specifies a requirement
        const empYears = extractYears(emp.yearsOfExperience ?? '');
        if (empYears > 0 && minRequiredYears > 0 && minRequiredYears !== 999) {
          if (empYears >= minRequiredYears) score += 5;
          else if (empYears >= minRequiredYears - 1) score += 2;
        }

        // Availability bonus (0–5)
        if (
          emp.availability &&
          emp.availability.toLowerCase() !== 'unavailable'
        ) {
          score += 5;
        }

        return { user, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const recommendations = scored
        .filter(({ score }) => score >= RECO_MIN_SCORE)
        .slice(0, take)
        .map(({ user }) => new EmployeeResponseDTO(user.employee));

      if (!hasBlocks) {
        await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);
      }
      return recommendations;
    } catch (error) {
      this.logger.warn(
        `Company recommendations unavailable for ${companyId}: ${(error as Error)?.message || 'Unknown error'}`,
      );
      return [];
    }
  }
}
