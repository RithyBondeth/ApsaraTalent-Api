import { CareerScope } from '@app/common/database/entities/career-scope.entity';
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
import {
  CompanyResponseDTO,
  EmployeeRecommendationsDTO,
  CompanyRecommendationsDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
} from '@app/contracts/dtos/user';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { IRecommendationsService } from '@app/contracts/interfaces/service/user-service.interface';

/**
 * Candidate recommendation for both sides of the marketplace: pgvector ANN
 * retrieval over career scopes, then in-process scoring of a bounded pool.
 * Split out of UserService — this is the most intricate logic in the service
 * and deserves to be readable on its own.
 */
@Injectable()
export class RecommendationsService implements IRecommendationsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepository: Repository<JobMatching>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Whether the user is on either side of any block. When true, feeds /
   * recommendations must bypass the cache so block/unblock reflects instantly
   * (cache-manager v7 pattern invalidation is a no-op here).
   */
  private async requesterHasBlocks(userId: string): Promise<boolean> {
    const rows = await this.userRepository.query(
      'SELECT 1 FROM user_block WHERE "blockerId" = $1 OR "blockedId" = $1 LIMIT 1',
      [userId],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  // ── Recommendation tuning ────────────────────────────────────────────
  // The pool is bounded so scoring never scans the whole platform (the cause
  // of the original 504s). ANN retrieval picks the most relevant candidates;
  // a broad top-up preserves recall when career scopes aren't tagged yet.
  private static readonly RECO_POOL_CAP = 200;
  private static readonly RECO_SCOPE_ANN_K = 25;
  private static readonly RECO_DEFAULT_LIMIT = 10;
  private static readonly RECO_MAX_LIMIT = 50;
  private static readonly RECO_MIN_SCORE = 10;

  // Excludes users blocked in either direction. Expects the root alias `user`
  // and binds :reqId. Shared by both recommendation candidate queries.
  private static readonly BLOCK_NOT_EXISTS = `NOT EXISTS (
    SELECT 1 FROM user_block ub
    WHERE (ub."blockerId" = :reqId AND ub."blockedId" = "user"."id")
       OR (ub."blockerId" = "user"."id" AND ub."blockedId" = :reqId)
  )`;

  private clampRecoLimit(limit?: number): number {
    const n = Number(limit);
    if (!Number.isFinite(n) || n < 1)
      return RecommendationsService.RECO_DEFAULT_LIMIT;
    return Math.min(Math.floor(n), RecommendationsService.RECO_MAX_LIMIT);
  }

  /** Average equal-length vectors into a unit centroid; null when none valid. */
  private vectorCentroid(vectors: number[][]): number[] | null {
    const valid = vectors.filter((v) => Array.isArray(v) && v.length > 0);
    if (valid.length === 0) return null;
    const dims = valid[0].length;
    const sum = new Array<number>(dims).fill(0);
    let used = 0;
    for (const v of valid) {
      if (v.length !== dims) continue;
      for (let i = 0; i < dims; i++) sum[i] += v[i];
      used++;
    }
    if (used === 0) return null;
    let mag = 0;
    for (let i = 0; i < dims; i++) {
      sum[i] /= used;
      mag += sum[i] * sum[i];
    }
    mag = Math.sqrt(mag);
    if (mag === 0) return null;
    for (let i = 0; i < dims; i++) sum[i] /= mag;
    return sum;
  }

  /** Format a number[] as a pgvector literal: [a,b,c]. */
  private toVectorLiteral(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }

  /**
   * Career-scope ids nearest to a query vector, using the HNSW cosine index
   * (idx_career_scope_embedding_hnsw). This is the ANN retrieval step that lets
   * Postgres — not Node — do the heavy similarity search over all scopes.
   */
  private async nearestScopeIds(
    queryVec: number[],
    k: number,
  ): Promise<string[]> {
    const rows = await this.careerScopeRepository
      .createQueryBuilder('cs')
      .select('cs.id', 'id')
      .where('cs.embedding IS NOT NULL')
      .orderBy('cs.embedding <=> CAST(:qvec AS vector)', 'ASC')
      .setParameter('qvec', this.toVectorLiteral(queryVec))
      .limit(k)
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  async getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    const { employeeId, requesterId } = employeeRecommendationsDTO;
    const take = this.clampRecoLimit(employeeRecommendationsDTO.limit);

    // Bypass the cache when the requester has any block so the recommendation
    // list never caches filtered results (an unblocked user would otherwise
    // stay hidden until TTL).
    const hasBlocks = requesterId
      ? await this.requesterHasBlocks(requesterId)
      : false;

    const cacheKey = this.redisService.generateListKey(
      'employee-recommendations',
      { employeeId, limit: take },
    );

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
        ...(employee?.educations ?? []).map((e) =>
          this.normalizeDegree(e.degree),
        ),
      );
      const empYears = this.extractYears(employee?.yearsOfExperience ?? '');
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
      const queryVec = this.vectorCentroid(empScopeEmbeddings);

      let userIds: string[] = [];

      if (queryVec) {
        const scopeIds = await this.nearestScopeIds(
          queryVec,
          RecommendationsService.RECO_SCOPE_ANN_K,
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
            .limit(RecommendationsService.RECO_POOL_CAP);
          if (likedCompanyIds.length > 0) {
            annQb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
              likedCompanyIds,
            });
          }
          if (requesterId) {
            annQb.andWhere(RecommendationsService.BLOCK_NOT_EXISTS, {
              reqId: requesterId,
            });
          }
          userIds = (await annQb.getRawMany<{ userId: string }>()).map(
            (r) => r.userId,
          );
        }
      }

      if (userIds.length < RecommendationsService.RECO_POOL_CAP) {
        const broadQb = this.userRepository
          .createQueryBuilder('user')
          .select('user.id', 'userId')
          .innerJoin('user.company', 'company')
          .innerJoin('company.openPositions', 'openPositions')
          .groupBy('user.id')
          .limit(RecommendationsService.RECO_POOL_CAP - userIds.length);
        if (likedCompanyIds.length > 0) {
          broadQb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
            likedCompanyIds,
          });
        }
        if (userIds.length > 0) {
          broadQb.andWhere('user.id NOT IN (:...have)', { have: userIds });
        }
        if (requesterId) {
          broadQb.andWhere(RecommendationsService.BLOCK_NOT_EXISTS, {
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
          .innerJoinAndSelect('user.company', 'company')
          .leftJoinAndSelect('company.careerScopes', 'careerScopes')
          .addSelect('careerScopes.embedding')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
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

      const empDescWords = this.extractKeywords(employee?.description ?? '');

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
            const required = (job.skillsRequired ?? '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            if (required.length === 0) continue;
            const matched = required.filter((r) =>
              empSkillNames.includes(r),
            ).length;
            bestRatio = Math.max(bestRatio, matched / required.length);
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
              `${job.title ?? ''} ${job.description ?? ''} ${job.skillsRequired ?? ''}`.toLowerCase();
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
            const required = this.normalizeDegree(job.educationRequired ?? '');
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
            const required = this.extractYears(job.experienceRequired ?? '');
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
        .filter(({ score }) => score >= RecommendationsService.RECO_MIN_SCORE)
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

  async getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    const { companyId, requesterId } = companyRecommendationsDTO;
    const take = this.clampRecoLimit(companyRecommendationsDTO.limit);

    const hasBlocks = requesterId
      ? await this.requesterHasBlocks(requesterId)
      : false;

    const cacheKey = this.redisService.generateListKey(
      'company-recommendations',
      { companyId, limit: take },
    );

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
        (job.skillsRequired ?? '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach((s) => allRequiredSkills.add(s));
      }

      // Highest education required across all jobs
      const maxRequiredDegree = Math.max(
        0,
        ...jobs.map((j) => this.normalizeDegree(j.educationRequired ?? '')),
      );

      // Minimum years required across all jobs (take lowest so more candidates qualify)
      const minRequiredYears = Math.min(
        ...jobs
          .map((j) => this.extractYears(j.experienceRequired ?? ''))
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
      const queryVec = this.vectorCentroid(cmpScopeEmbeddings);

      let userIds: string[] = [];

      if (queryVec) {
        const scopeIds = await this.nearestScopeIds(
          queryVec,
          RecommendationsService.RECO_SCOPE_ANN_K,
        );
        if (scopeIds.length > 0) {
          const annQb = this.userRepository
            .createQueryBuilder('user')
            .select('user.id', 'userId')
            .innerJoin('user.employee', 'employee')
            .innerJoin('employee.careerScopes', 'cs')
            .where('cs.id IN (:...scopeIds)', { scopeIds })
            .groupBy('user.id')
            .limit(RecommendationsService.RECO_POOL_CAP);
          if (likedEmployeeIds.length > 0) {
            annQb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
              likedEmployeeIds,
            });
          }
          if (requesterId) {
            annQb.andWhere(RecommendationsService.BLOCK_NOT_EXISTS, {
              reqId: requesterId,
            });
          }
          userIds = (await annQb.getRawMany<{ userId: string }>()).map(
            (r) => r.userId,
          );
        }
      }

      if (userIds.length < RecommendationsService.RECO_POOL_CAP) {
        const broadQb = this.userRepository
          .createQueryBuilder('user')
          .select('user.id', 'userId')
          .innerJoin('user.employee', 'employee')
          .groupBy('user.id')
          .limit(RecommendationsService.RECO_POOL_CAP - userIds.length);
        if (likedEmployeeIds.length > 0) {
          broadQb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
            likedEmployeeIds,
          });
        }
        if (userIds.length > 0) {
          broadQb.andWhere('user.id NOT IN (:...have)', { have: userIds });
        }
        if (requesterId) {
          broadQb.andWhere(RecommendationsService.BLOCK_NOT_EXISTS, {
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
        .innerJoinAndSelect('user.employee', 'employee')
        .addSelect('employee.jobEmbedding')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      const [scopeUsers, skillUsers, expUsers, eduUsers] = await Promise.all([
        this.userRepository
          .createQueryBuilder('user')
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.careerScopes', 'careerScopes')
          .addSelect('careerScopes.embedding')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.skills', 'skills')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
          .innerJoinAndSelect('user.employee', 'employee')
          .leftJoinAndSelect('employee.experiences', 'experiences')
          .where('user.id IN (:...userIds)', { userIds })
          .getMany(),
        this.userRepository
          .createQueryBuilder('user')
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
            `${j.title ?? ''} ${j.description ?? ''} ${j.skillsRequired ?? ''}`,
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
        const empDescWords = this.extractKeywords(emp.description ?? '');
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
          ...(emp.educations ?? []).map((e) => this.normalizeDegree(e.degree)),
        );
        if (empMaxDegree > 0 && maxRequiredDegree > 0) {
          if (empMaxDegree >= maxRequiredDegree) score += 5;
          else if (empMaxDegree === maxRequiredDegree - 1) score += 2;
        }

        // Experience bonus: only when BOTH employee has years stated AND job specifies a requirement
        const empYears = this.extractYears(emp.yearsOfExperience ?? '');
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
        .filter(({ score }) => score >= RecommendationsService.RECO_MIN_SCORE)
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

  /**
   * Maps a degree string to a numeric rank for comparison.
   * Higher rank = higher education level.
   */
  private normalizeDegree(degree: string): number {
    const d = (degree ?? '').toLowerCase();
    if (d.includes('phd') || d.includes('doctor')) return 5;
    if (d.includes('master')) return 4;
    if (
      d.includes('bachelor') ||
      d.includes('b.sc') ||
      d.includes('b.a') ||
      d.includes('undergraduate') ||
      d.includes('degree')
    )
      return 3;
    if (d.includes('associate') || d.includes('diploma')) return 2;
    if (d.includes('high school') || d.includes('secondary')) return 1;
    return 0;
  }

  /**
   * Extracts the first integer from an experience string like "3 years", "3-5 years", "5+ years".
   */
  private extractYears(text: string): number {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private static readonly STOP_WORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'have',
    'this',
    'from',
    'they',
    'will',
    'been',
    'more',
    'when',
    'also',
    'into',
    'than',
    'then',
    'some',
    'what',
    'which',
    'there',
    'their',
    'about',
    'would',
    'other',
    'after',
    'first',
    'well',
    'very',
    'even',
    'such',
    'most',
    'over',
    'your',
    'our',
  ]);

  /**
   * Extracts meaningful keywords from a text — words longer than 3 chars, not stop words.
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];
    return [
      ...new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(
            (w) => w.length > 3 && !RecommendationsService.STOP_WORDS.has(w),
          ),
      ),
    ];
  }
}
