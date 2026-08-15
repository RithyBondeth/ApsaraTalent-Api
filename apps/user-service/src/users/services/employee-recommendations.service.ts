import {
  scopeSetSimilarityScore,
  jobTitleSimilarityScore,
  parseEmbedding,
} from '@app/common/embedding/embedding.util';
import { Job } from '@app/common/database/entities/company/job.entity';
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
  skillOverlapRatio,
} from '@app/common/utils/skill.util';
import { RecommendationSupportService } from './recommendation-support.service';
import {
  CompanyResponseDTO,
  EmployeeRecommendationsDTO,
  JobPositionResponseDTO,
} from '@app/contracts/dtos/user';
import { IEmployeeRecommendationsService } from '@app/contracts/interfaces/service/user-service.interface';

/**
 * Companies recommended to an employee: pgvector ANN retrieval over career
 * scopes, then in-process scoring of a bounded candidate pool.
 */
@Injectable()
export class EmployeeRecommendationsService implements IEmployeeRecommendationsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepository: Repository<JobMatching>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    private readonly support: RecommendationSupportService,
  ) {}

  async getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    const { employeeId, requesterId } = employeeRecommendationsDTO;
    const take = clampRecoLimit(employeeRecommendationsDTO.limit);

    // Bypass the cache when the requester has any block so the recommendation
    // list never caches filtered results (an unblocked user would otherwise
    // stay hidden until TTL).
    const hasBlocks = requesterId
      ? await this.support.requesterHasBlocks(requesterId)
      : false;

    const cacheKey = generateListKey('employee-recommendations', {
      employeeId,
      limit: take,
    });

    if (!hasBlocks) {
      const cached = await this.redisService.get<any[]>(cacheKey);
      if (cached) {
        this.logger.info(`Employee ${employeeId} recommendations cache HIT`);
        return cached;
      }
    }

    this.logger.info(`Employee ${employeeId} recommendations cache MISS`);

    try {
      // 1. Load employee with full profile data needed for scoring.
      //    `addSelect(...)` overrides select:false to load embedding vectors.
      const employeeUser = await this.userRepository
        .createQueryBuilder('user')
        // Only `.employee` is read from this row. Without an explicit select
        // TypeORM ships every user column — password, refreshToken, otpCode,
        // twoFactorSecret — none of which this endpoint has any use for.
        .select(['user.id'])
        .leftJoinAndSelect('user.employee', 'employee')
        .addSelect('employee.jobEmbedding')
        .leftJoinAndSelect('employee.careerScopes', 'empCareerScopes')
        .addSelect('empCareerScopes.embedding')
        .leftJoinAndSelect('employee.skills', 'empSkills')
        .leftJoinAndSelect('employee.educations', 'empEducations')
        .where('employee.id = :employeeId', { employeeId })
        .getOne();

      const employee = employeeUser?.employee ?? null;
      const empSkillNames = (employee?.skills ?? []).map((s) =>
        s.name.toLowerCase().trim(),
      );
      const empMaxDegreeRank = Math.max(
        0,
        ...(employee?.educations ?? []).map((e) => normalizeDegree(e.degree)),
      );
      const empYears = extractYears(employee?.yearsOfExperience ?? '');
      const empJobTitle = (employee?.job ?? '').toLowerCase();
      const empJobEmbedding = parseEmbedding((employee as any)?.jobEmbedding);

      // 2. Get company IDs the employee has already liked — read the FK column
      //    directly instead of hydrating each JobMatching + its company.
      const likedRows = await this.jobMatchingRepository
        .createQueryBuilder('jm')
        .select('jm."companyId"', 'companyId')
        .where('jm."employeeId" = :employeeId', { employeeId })
        .andWhere('jm."employeeLiked" = true')
        .getRawMany<{ companyId: string }>();
      const likedCompanyIds = likedRows.map((r) => r.companyId).filter(Boolean);

      // 3. Candidate pool (BOUNDED — retrieve-then-rerank).
      //    Step 1: use the pgvector HNSW index to find the companies whose
      //    career scopes are semantically nearest the employee. Step 2: top up
      //    with a broad capped pool so recall holds when scopes aren't tagged.
      //    Detailed scoring below re-ranks this bounded set; MIN_SCORE drops
      //    the unrelated. This replaces the previous full-table scan.
      const empScopeEmbeddings = (employee?.careerScopes ?? [])
        .map((s) => parseEmbedding((s as any).embedding))
        .filter((v): v is number[] => Array.isArray(v) && v.length > 0);
      const queryVec = vectorCentroid(empScopeEmbeddings);

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
            .innerJoin('user.company', 'company')
            .innerJoin('company.openPositions', 'openPositions')
            .innerJoin('company.careerScopes', 'cs')
            .where('cs.id IN (:...scopeIds)', { scopeIds })
            .groupBy('user.id')
            .limit(RECO_POOL_CAP);
          if (likedCompanyIds.length > 0) {
            annQb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
              likedCompanyIds,
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
          .innerJoin('user.company', 'company')
          .innerJoin('company.openPositions', 'openPositions')
          .groupBy('user.id')
          .limit(RECO_POOL_CAP - userIds.length);
        if (likedCompanyIds.length > 0) {
          broadQb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
            likedCompanyIds,
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
      //    Career scopes and open positions are loaded in separate single-
      //    collection queries (each carries its embedding once) and stitched,
      //    instead of one multi-join that duplicates embeddings across rows.
      //    benefits/values aren't needed for scoring — loaded later for the page.
      const [scopeUsers, posUsers] = await Promise.all([
        this.userRepository
          .createQueryBuilder('user')
          // Only `user.company` is read from these rows. Without an explicit
          // select TypeORM ships every user column — including password,
          // refreshToken, otpCode and twoFactorSecret — for the whole
          // candidate pool (up to RECO_POOL_CAP users).
          .select(['user.id'])
          .innerJoinAndSelect('user.company', 'company')
          .leftJoinAndSelect('company.careerScopes', 'careerScopes')
          .addSelect('careerScopes.embedding')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .select(['user.id'])
          .innerJoinAndSelect('user.company', 'company')
          .leftJoinAndSelect('company.openPositions', 'openPositions')
          .addSelect('openPositions.titleEmbedding')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
      ]);

      const positionsByCompany = new Map<string, Job[]>();
      for (const u of posUsers) {
        if (u.company) {
          positionsByCompany.set(u.company.id, u.company.openPositions ?? []);
        }
      }
      const users = scopeUsers.filter((u) => u.company);
      for (const u of users) {
        u.company.openPositions = positionsByCompany.get(u.company.id) ?? [];
      }

      const empDescWords = extractKeywords(employee?.description ?? '');

      // 5. Multi-factor weighted scoring (max 100 pts)
      //    Factor 1: Career scope overlap       0–35  (field match — highest weight)
      //    Factor 2: Skill match ratio           0–30  (specific skill fit)
      //    Factor 3: Job title semantic match    0–20  (role relevance via pgvector)
      //    Factor 4: Description content match   0–10  (context fit)
      //    Factor 5: Location match               0–5  (minor bonus)
      //    Education/Experience: only score when BOTH sides have data (no points for empty fields)
      const scored = users.map((user) => {
        const company = user.company;
        const jobs = company.openPositions ?? [];
        let score = 0;

        // Factor 1: Career scope semantic similarity (0–35)
        // Uses pgvector cosine similarity so "Full Stack Development" ↔
        // "Backend Developer" ↔ "Software Engineer" all score correctly.
        // Falls back to exact ID overlap when embeddings are unavailable.
        score += scopeSetSimilarityScore(
          employee?.careerScopes ?? [],
          company.careerScopes ?? [],
          35,
        );

        // Factor 2: Best skill match ratio across all open positions (0–30)
        if (empSkillNames.length > 0 && jobs.length > 0) {
          let bestRatio = 0;
          for (const job of jobs) {
            const ratio = skillOverlapRatio(
              empSkillNames,
              getJobSkillNames(job),
            );
            if (ratio !== null) bestRatio = Math.max(bestRatio, ratio);
          }
          score += bestRatio * 30;
        }

        // Factor 3: Job title semantic similarity (0–20)
        // Uses pgvector cosine similarity between employee's current job/position
        // and each company's open position title. Falls back to keyword overlap
        // when embeddings are missing (e.g. before backfill completes).
        if (empJobEmbedding) {
          score += jobTitleSimilarityScore(empJobEmbedding, jobs as any[], 20);
        } else if (empJobTitle) {
          // Keyword fallback
          const empTitleWords = empJobTitle
            .split(/\s+/)
            .filter((w) => w.length > 3);
          if (empTitleWords.length > 0 && jobs.length > 0) {
            let bestTitleScore = 0;
            for (const job of jobs) {
              const jobText =
                `${job.title ?? ''} ${job.description ?? ''}`.toLowerCase();
              const matched = empTitleWords.filter((w) =>
                jobText.includes(w),
              ).length;
              bestTitleScore = Math.max(
                bestTitleScore,
                matched / empTitleWords.length,
              );
            }
            score += bestTitleScore * 20;
          }
        }

        // Factor 4: Description keyword match (0–10)
        if (empDescWords.length > 0 && jobs.length > 0) {
          let bestDescScore = 0;
          for (const job of jobs) {
            const jobText =
              `${job.title ?? ''} ${job.description ?? ''} ${getJobSkillNames(job).join(' ')}`.toLowerCase();
            const matched = empDescWords.filter((w) =>
              jobText.includes(w),
            ).length;
            bestDescScore = Math.max(
              bestDescScore,
              matched / empDescWords.length,
            );
          }
          score += bestDescScore * 10;
        }

        // Factor 5: Location match (0–5)
        if (
          employee?.location &&
          company.location &&
          employee.location.toLowerCase().trim() ===
            company.location.toLowerCase().trim()
        ) {
          score += 5;
        }

        // Education bonus: only when BOTH employee has education AND job specifies a requirement
        if (empMaxDegreeRank > 0 && jobs.length > 0) {
          let bestEduScore = 0;
          for (const job of jobs) {
            const required = normalizeDegree(job.educationRequired ?? '');
            if (required === 0) continue; // skip jobs with no stated requirement
            if (empMaxDegreeRank >= required)
              bestEduScore = Math.max(bestEduScore, 5);
            else if (empMaxDegreeRank === required - 1)
              bestEduScore = Math.max(bestEduScore, 2);
          }
          score += bestEduScore;
        }

        // Experience bonus: only when BOTH employee has years stated AND job specifies a requirement
        if (empYears > 0 && jobs.length > 0) {
          let bestExpScore = 0;
          for (const job of jobs) {
            const required = extractYears(job.experienceRequired ?? '');
            if (required === 0) continue; // skip jobs with no stated requirement
            if (empYears >= required) bestExpScore = Math.max(bestExpScore, 5);
            else if (empYears >= required - 1)
              bestExpScore = Math.max(bestExpScore, 2);
          }
          score += bestExpScore;
        }

        return { user, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // MIN_SCORE filters out companies that are truly unrelated (e.g. healthcare for a developer)
      // while keeping companies that haven't fully filled their profile but are still relevant.
      // Apply `limit` here so only the returned page is enriched below.
      const ranked = scored
        .filter(({ score }) => score >= RECO_MIN_SCORE)
        .slice(0, take);

      if (ranked.length === 0) {
        if (!hasBlocks) {
          await this.redisService.set(cacheKey, [], CACHE_TTL.LONG);
        }
        return [];
      }

      // Load benefits/values only for the ranked page (≤ take companies), so the
      // 2-collection cartesian here is trivially small.
      const rankedCompanyIds = ranked.map(({ user }) => user.company.id);
      const bvUsers = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id'])
        .innerJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.benefits', 'benefits')
        .leftJoinAndSelect('company.values', 'values')
        .where('company.id IN (:...rankedCompanyIds)', { rankedCompanyIds })
        .getMany();
      const bvByCompany = new Map<string, { benefits: any[]; values: any[] }>();
      for (const u of bvUsers) {
        if (u.company) {
          bvByCompany.set(u.company.id, {
            benefits: u.company.benefits ?? [],
            values: u.company.values ?? [],
          });
        }
      }

      const recommendations = ranked.map(({ user }) => {
        const bv = bvByCompany.get(user.company.id);
        return new CompanyResponseDTO({
          ...user.company,
          benefits: bv?.benefits ?? [],
          values: bv?.values ?? [],
          openPositions: (user.company?.openPositions ?? []).map(
            (job) => new JobPositionResponseDTO(job),
          ),
        });
      });

      if (!hasBlocks) {
        await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);
      }
      return recommendations;
    } catch (error) {
      this.logger.warn(
        `Employee recommendations unavailable for ${employeeId}: ${(error as Error)?.message || 'Unknown error'}`,
      );
      return [];
    }
  }
}
