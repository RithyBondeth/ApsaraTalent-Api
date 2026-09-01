import { Job } from '@app/common/database/entities/company/job.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Brackets, MoreThan, Repository, SelectQueryBuilder } from 'typeorm';
import { SCOPE_SIMILARITY_THRESHOLD } from '@app/common/embedding/embedding.service';
import {
  experienceYearsSql,
  parseExperienceRange,
} from '@app/common/utils/experience-level.util';
import {
  RELEVANCE_SORT,
  relevanceParams,
  relevanceScoreSql,
} from '@app/common/utils/search-relevance.util';
import {
  JobResponseDTO,
  SearchJobResponseDTO,
  SearchJobResult,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { IJobServiceService } from '@app/contracts/interfaces/service/job-service.interface';
import { JOB } from '@app/contracts/constants/domain/job.constant';
import { PaginationDTO } from '@app/contracts';
import {
  generateJobListKey,
  generateJobSearchKey,
} from '@app/common/redis/redis-keys.util';

@Injectable()
export class JobService implements IJobServiceService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {
    this.logger.setContext(JobService.name);
  }

  async findAllJobs(paginationDTO: PaginationDTO): Promise<JobResponseDTO[]> {
    const { skip = 0, limit = 20 } = paginationDTO;
    const cacheKey = `${generateJobListKey()}:skip:${skip}:limit:${limit}`;
    const cached = await this.redisService.get<JobResponseDTO[]>(cacheKey);
    if (cached) {
      this.logger.info('All jobs cache HIT');
      // Rebuild the DTOs. Redis stores JSON, and JSON.stringify copies only
      // own properties — `skills`, `experience` and `education` are @Expose()
      // getters on the prototype, so they never survive the round trip. The
      // fields they derive from do, so reconstructing recomputes them and a
      // hit returns the same shape as a miss.
      return cached.map((job) => new JobResponseDTO(job));
    }
    this.logger.info('All jobs cache MISS');

    try {
      const now = new Date();
      const jobs = await this.jobRepo.find({
        relations: ['company', 'company.user'],
        where: [{ expireDate: null }, { expireDate: MoreThan(now) }],
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      const result = jobs.map((job) => new JobResponseDTO(job));
      await this.redisService.set(cacheKey, result, JOB.JOB_LIST_TTL);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'An error occurred while fetching the job',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async searchJobs(searchJobDTO: SearchJobDTO): Promise<SearchJobResult> {
    // Per-user liked exclusions make the cache key unique per user and would
    // bloat Redis with single-use entries — bypass the cache when present.
    const hasExclusions =
      !!searchJobDTO.excludeCompanyIds &&
      searchJobDTO.excludeCompanyIds.length > 0;

    const cacheKey = generateJobSearchKey(searchJobDTO);

    if (!hasExclusions) {
      const cached = await this.redisService.get<SearchJobResult>(cacheKey);
      if (cached) {
        this.logger.info('Job search cache HIT');
        // Same getter loss as findAllJobs: without this the client gets a job
        // with no `skills`, and the search card crashes on `skills.length`.
        return {
          ...cached,
          data: cached.data.map((job) => new SearchJobResponseDTO(job)),
        };
      }
      this.logger.info('Job search cache MISS');
    }

    try {
      const {
        keyword,
        location,
        careerScopes,
        companySizeMin,
        companySizeMax,
        postedDateFrom,
        postedDateTo,
        sortBy = RELEVANCE_SORT,
        sortOrder = 'DESC',
        salaryMin,
        salaryMax,
        jobType,
        experienceLevel,
        educationRequired,
        workMode,
        page = 1,
        pageSize = 20,
        excludeCompanyIds,
        requesterId,
      } = searchJobDTO;

      const buildQuery = (withScopes: boolean): SelectQueryBuilder<Job> => {
        const now = new Date();
        const qb = this.jobRepo
          .createQueryBuilder('job')
          .leftJoinAndSelect('job.company', 'company')
          .leftJoinAndSelect('company.careerScopes', 'careerScope')
          .leftJoinAndSelect('company.user', 'user')
          .where('(job.expireDate IS NULL OR job.expireDate > :now)', { now });

        if (keyword) {
          qb.andWhere(
            `(
               job.title ILIKE :keyword
               OR job.description ILIKE :keyword
               OR job."skillsRequired" ILIKE :keyword
               OR EXISTS (
                 SELECT 1 FROM job_skills_skill jss
                 INNER JOIN skill kw_skill ON kw_skill.id = jss."skillId"
                 WHERE jss."jobId" = job.id
                   AND kw_skill.name ILIKE :keyword
               )
             )`,
            { keyword: `%${keyword}%` },
          );
        }

        if (location) {
          qb.andWhere(
            `(job.location ILIKE :location
              OR (job.location IS NULL AND company.location ILIKE :location))`,
            { location: `%${location}%` },
          );
        }

        // BUG 4b: workMode was declared on the DTO and validated, but no query
        // ever read it — remote/hybrid/on-site was unfilterable.
        if (workMode) {
          qb.andWhere('job."workMode" = :workMode', { workMode });
        }

        if (companySizeMin || companySizeMax) {
          qb.andWhere('company.companySize BETWEEN :csMin AND :csMax', {
            csMin: companySizeMin || 0,
            csMax: companySizeMax || JOB.MAX_COMPANY_SIZE,
          });
        }

        if (postedDateFrom || postedDateTo) {
          qb.andWhere('job.createdAt BETWEEN :from AND :to', {
            from: postedDateFrom ? new Date(postedDateFrom) : new Date(0),
            to: postedDateTo ? new Date(postedDateTo) : new Date(),
          });
        }

        // SQL salary range filter using numeric columns
        if (salaryMin !== undefined || salaryMax !== undefined) {
          qb.andWhere(
            `(
               job."salaryMin" IS NULL
               OR job."salaryMax" IS NULL
               OR (job."salaryMin" <= :salaryMax AND job."salaryMax" >= :salaryMin)
             )`,
            {
              salaryMin: salaryMin ?? 0,
              salaryMax: salaryMax ?? Number.MAX_SAFE_INTEGER,
            },
          );
        }

        if (jobType && jobType.length > 0) {
          qb.andWhere(
            new Brackets((inner) => {
              jobType.forEach((type, index) => {
                const param = `jtype_${index}`;
                if (index === 0) {
                  inner.where(`job.type ILIKE :${param}`, {
                    [param]: `%${type}%`,
                  });
                } else {
                  inner.orWhere(`job.type ILIKE :${param}`, {
                    [param]: `%${type}%`,
                  });
                }
              });
            }),
          );
        }

        const experienceRange = parseExperienceRange(experienceLevel);
        if (experienceRange) {
          const years = experienceYearsSql('job."experienceRequired"');
          qb.andWhere(`${years} BETWEEN :minYears AND :maxYears`, {
            minYears: experienceRange.min,
            maxYears: experienceRange.max,
          });
        }

        if (educationRequired && educationRequired.length > 0) {
          qb.andWhere(
            new Brackets((inner) => {
              educationRequired.forEach((edu, index) => {
                const param = `edu_${index}`;
                if (index === 0) {
                  inner.where(`LOWER(job.educationRequired) ILIKE :${param}`, {
                    [param]: `%${edu.toLowerCase()}%`,
                  });
                } else {
                  inner.orWhere(
                    `LOWER(job.educationRequired) ILIKE :${param}`,
                    {
                      [param]: `%${edu.toLowerCase()}%`,
                    },
                  );
                }
              });
            }),
          );
        }

        if (excludeCompanyIds && excludeCompanyIds.length > 0) {
          qb.andWhere('company.id NOT IN (:...excludeCompanyIds)', {
            excludeCompanyIds,
          });
        }

        // Hide jobs from companies blocked in EITHER direction between the
        // searcher and the company (mutual invisibility).
        if (requesterId) {
          qb.andWhere(
            `NOT EXISTS (
               SELECT 1 FROM user_block ub
               WHERE (ub."blockerId" = :requesterId AND ub."blockedId" = "user"."id")
                  OR (ub."blockerId" = "user"."id" AND ub."blockedId" = :requesterId)
             )`,
            { requesterId },
          );
        }

        if (withScopes && careerScopes && careerScopes.length > 0) {
          qb.andWhere(
            `EXISTS (
               SELECT 1
               FROM company_career_scopes_career_scope ccs
               INNER JOIN career_scope cs_candidate
                 ON cs_candidate.id = ccs."careerScopeId"
               WHERE ccs."companyId" = company.id
                 AND (
                   (
                     cs_candidate.embedding IS NOT NULL
                     AND EXISTS (
                       SELECT 1 FROM career_scope cs_ref
                       WHERE cs_ref.name IN (:...searchScopes)
                         AND cs_ref.embedding IS NOT NULL
                         AND (1 - (cs_candidate.embedding <=> cs_ref.embedding)) > :simThreshold
                     )
                   )
                   OR cs_candidate.name IN (:...searchScopes)
                 )
             )`,
            {
              searchScopes: careerScopes,
              simThreshold: SCOPE_SIMILARITY_THRESHOLD,
            },
          );
        }

        const validSortFields = [
          RELEVANCE_SORT,
          'createdAt',
          'title',
          'companySize',
        ];
        const field = validSortFields.includes(sortBy)
          ? sortBy
          : RELEVANCE_SORT;
        const order =
          (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        if (field === RELEVANCE_SORT) {
          // Relevance needs something to be relevant to. With no keyword there
          // is no signal to rank on, so it degrades to newest-first — which is
          // what the feed should show when the user has not asked for anything.
          if (keyword) {
            const score = relevanceScoreSql({
              primary: 'job.title',
              secondary: ['job."skillsRequired"', 'company.name'],
              tertiary: ['job.description'],
            });
            qb.addSelect(score, 'relevance_score')
              .setParameters(relevanceParams(keyword))
              .orderBy('relevance_score', 'DESC')
              .addOrderBy('job.createdAt', 'DESC');
          } else {
            qb.orderBy('job.createdAt', order);
          }
          qb.addOrderBy('job.id', 'ASC');
        } else if (field === 'companySize') {
          qb.orderBy(`company.${field}`, order).addOrderBy('job.id', 'ASC');
        } else {
          qb.orderBy(`job.${field}`, order).addOrderBy('job.id', 'ASC');
        }

        return qb;
      };

      const scopedQuery = buildQuery(true);
      scopedQuery.skip((page - 1) * pageSize).take(pageSize);
      const [jobs, total] = await scopedQuery.getManyAndCount();

      // Scope fallback: on page 1, if the scoped query returned nothing and
      // scopes were provided, retry without the scope filter.
      let finalJobs = jobs;
      let finalTotal = total;
      let isUsingFallback = false;

      if (jobs.length === 0 && (careerScopes?.length ?? 0) > 0 && page === 1) {
        const fallbackQuery = buildQuery(false);
        fallbackQuery.skip(0).take(pageSize);
        const [fbJobs, fbTotal] = await fallbackQuery.getManyAndCount();
        finalJobs = fbJobs;
        finalTotal = fbTotal;
        isUsingFallback = true;
      }

      const result: SearchJobResult = {
        data: finalJobs.map((job) => new SearchJobResponseDTO(job)),
        total: finalTotal,
        page,
        pageSize,
        isUsingFallback,
      };

      if (!hasExclusions) {
        await this.redisService.set(cacheKey, result, JOB.JOB_SEARCH_TTL);
      }
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while searching for jobs',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
