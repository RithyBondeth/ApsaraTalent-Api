import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { SCOPE_SIMILARITY_THRESHOLD } from '@app/common/embedding/embedding.service';
import {
  SearchEmployeeDTO,
  SearchEmployeeResponseDTO,
  SearchEmployeeResult,
} from '@app/contracts/dtos/user';
import { ISearchEmployeeService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

@Injectable()
export class SearchEmployeeService implements ISearchEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async searchEmployee(
    searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResult> {
    // Per-user liked exclusions make the cache key unique per user and would
    // bloat Redis with single-use entries — bypass the cache when present.
    const hasExclusions =
      !!searchEmployeeDTO.excludeEmployeeIds &&
      searchEmployeeDTO.excludeEmployeeIds.length > 0;

    const cacheKey = this.redisService.generateSearchKey(
      'employee',
      searchEmployeeDTO,
    );

    if (!hasExclusions) {
      const cached =
        await this.redisService.get<SearchEmployeeResult>(cacheKey);

      if (cached) {
        this.logger.info('Employee search cache HIT');
        return cached;
      }

      this.logger.info('Employee search cache MISS');
    }

    try {
      const {
        keyword,
        location,
        careerScopes,
        jobType,
        experienceLevel,
        education,
        sortBy,
        sortOrder,
        page = 1,
        pageSize = 20,
        excludeEmployeeIds,
        requesterId,
      } = searchEmployeeDTO;

      const buildQuery = (
        withScopes: boolean,
      ): SelectQueryBuilder<Employee> => {
        const qb = this.employeeRepo
          .createQueryBuilder('employee')
          .leftJoinAndSelect('employee.user', 'user')
          .leftJoinAndSelect('employee.skills', 'skill')
          .leftJoinAndSelect('employee.careerScopes', 'careerScope')
          .leftJoinAndSelect('employee.experiences', 'experience')
          .leftJoinAndSelect('employee.educations', 'edu')
          .where('employee.isHide = :isHide', { isHide: false });

        if (keyword) {
          qb.andWhere(
            '(employee.job ILIKE :keyword OR employee.firstname ILIKE :keyword OR employee.lastname ILIKE :keyword)',
            { keyword: `%${keyword}%` },
          );
        }

        if (location) {
          qb.andWhere('employee.location ILIKE :location', {
            location: `%${location}%`,
          });
        }

        if (jobType) {
          qb.andWhere('employee.availability = :jobType', { jobType });
        }

        if (
          experienceLevel &&
          experienceLevel !== 'All' &&
          experienceLevel !== ''
        ) {
          qb.andWhere('employee.yearsOfExperience = :experienceLevel', {
            experienceLevel,
          });
        }

        if (education && education.length > 0) {
          qb.andWhere(
            new Brackets((bracket) => {
              education.forEach((edu, index) => {
                const paramName = `degree_${index}`;
                if (index === 0) {
                  bracket.where(`edu.degree ILIKE :${paramName}`, {
                    [paramName]: `%${edu}%`,
                  });
                } else {
                  bracket.orWhere(`edu.degree ILIKE :${paramName}`, {
                    [paramName]: `%${edu}%`,
                  });
                }
              });
            }),
          );
        }

        if (excludeEmployeeIds && excludeEmployeeIds.length > 0) {
          qb.andWhere('employee.id NOT IN (:...excludeEmployeeIds)', {
            excludeEmployeeIds,
          });
        }

        // Hide candidates blocked in EITHER direction between the searcher and
        // the candidate (mutual invisibility).
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

        if (withScopes && (careerScopes?.length ?? 0) > 0) {
          qb.andWhere(
            `EXISTS (
               SELECT 1
               FROM employee_career_scopes_career_scope ecs
               INNER JOIN career_scope cs_candidate
                 ON cs_candidate.id = ecs."careerScopeId"
               WHERE ecs."employeeId" = employee.id
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
          'firstname',
          'lastname',
          'yearsOfExperience',
          'createdAt',
        ];
        const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const order = (sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as
          | 'ASC'
          | 'DESC';

        if (field === 'yearsOfExperience') {
          qb.orderBy(
            `CASE "employee"."yearsOfExperience"
              WHEN 'No Experience' THEN 0
              WHEN 'Less than 1 year' THEN 1
              WHEN '1 - 2 years' THEN 2
              WHEN '3 - 5 years' THEN 3
              WHEN '6 - 10 years' THEN 4
              WHEN '10+ years' THEN 5
              ELSE 6
            END`,
            order,
          ).addOrderBy('employee.id', 'ASC');
        } else {
          qb.orderBy(`employee.${field}`, order).addOrderBy(
            'employee.id',
            'ASC',
          );
        }

        return qb;
      };

      const scopedQuery = buildQuery(true);
      scopedQuery.skip((page - 1) * pageSize).take(pageSize);
      const [employees, total] = await scopedQuery.getManyAndCount();

      // Scope fallback: on page 1, if the scoped query returned nothing and
      // scopes were provided, retry without the scope filter.
      let finalEmployees = employees;
      let finalTotal = total;
      let isUsingFallback = false;

      if (
        employees.length === 0 &&
        (careerScopes?.length ?? 0) > 0 &&
        page === 1
      ) {
        const fallbackQuery = buildQuery(false);
        fallbackQuery.skip(0).take(pageSize);
        const [fbEmps, fbTotal] = await fallbackQuery.getManyAndCount();
        finalEmployees = fbEmps;
        finalTotal = fbTotal;
        isUsingFallback = true;
      }

      const result: SearchEmployeeResult = {
        data: finalEmployees.map(
          (employee) =>
            new SearchEmployeeResponseDTO({
              ...employee,
              userId: employee.user?.id,
            }),
        ),
        total: finalTotal,
        page,
        pageSize,
        isUsingFallback,
      };

      if (!hasExclusions) {
        await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);
      }
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while searching for employees.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while searching for employees.',
        statusCode: 500,
      });
    }
  }
}
