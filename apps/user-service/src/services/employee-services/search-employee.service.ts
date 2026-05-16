import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Brackets, Repository } from 'typeorm';
import { SCOPE_SIMILARITY_THRESHOLD } from '@app/common/embedding/embedding.service';
import {
  SearchEmployeeDTO,
  SearchEmployeeResponseDTO,
} from '@app/contracts/dtos/user';
import { ISearchEmployeeService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

@Injectable()
export class SearchEmployeeService implements ISearchEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async searchEmployee(
    searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]> {
    const cacheKey = this.redisService.generateSearchKey(
      'employee',
      searchEmployeeDTO,
    );
    const cached =
      await this.redisService.get<SearchEmployeeResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('Employee search cache HIT');
      return cached;
    }

    this.logger.info('Employee search cache MISS');

    try {
      const qb = this.employeeRepo
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.skills', 'skill')
        .leftJoinAndSelect('employee.careerScopes', 'careerScope')
        .leftJoinAndSelect('employee.experiences', 'experience')
        .leftJoinAndSelect('employee.educations', 'edu')
        .where('employee.isHide = :isHide', { isHide: false });

      // Keyword: job title, first name, last name
      if (searchEmployeeDTO.keyword) {
        qb.andWhere(
          `(employee.job ILIKE :keyword OR employee.firstname ILIKE :keyword OR employee.lastname ILIKE :keyword)`,
          { keyword: `%${searchEmployeeDTO.keyword}%` },
        );
      }

      // Location
      if (searchEmployeeDTO.location) {
        qb.andWhere('employee.location ILIKE :location', {
          location: `%${searchEmployeeDTO.location}%`,
        });
      }

      // Career Scopes — semantic similarity via pgvector cosine distance.
      // For each candidate employee scope, we check whether ANY of the
      // user's search scopes has a stored embedding close enough (cosine
      // similarity > threshold).  This means "Full Stack Development" will
      // correctly match "Backend Developer", "Full Stack Engineer", etc.
      // Employees whose scopes have no embedding yet are excluded when a
      // scope filter is active; run the backfill script to cover them.
      // Career Scopes — semantic similarity via pgvector.
      // Bypasses the TypeORM alias entirely: joins the junction table and
      // career_scope independently inside a correlated EXISTS so PostgreSQL
      // never needs to resolve the unmapped `embedding` column via the ORM alias.
      if (searchEmployeeDTO.careerScopes?.length > 0) {
        qb.andWhere(
          `EXISTS (
             SELECT 1
             FROM employee_career_scopes_career_scope ecs
             INNER JOIN career_scope cs_candidate
               ON cs_candidate.id = ecs."careerScopeId"
             WHERE ecs."employeeId" = employee.id
               AND (
                 -- Branch A: semantic match via pgvector (when both sides have embeddings)
                 (
                   cs_candidate.embedding IS NOT NULL
                   AND EXISTS (
                     SELECT 1 FROM career_scope cs_ref
                     WHERE cs_ref.name IN (:...searchScopes)
                       AND cs_ref.embedding IS NOT NULL
                       AND (1 - (cs_candidate.embedding <=> cs_ref.embedding)) > :simThreshold
                   )
                 )
                 OR
                 -- Branch B: exact name fallback (used while embeddings are being built,
                 --           or when a scope has no embedding yet). Ensures results are
                 --           always consistent regardless of embedding availability.
                 cs_candidate.name IN (:...searchScopes)
               )
           )`,
          {
            searchScopes: searchEmployeeDTO.careerScopes,
            simThreshold: SCOPE_SIMILARITY_THRESHOLD,
          },
        );
      }

      // Job Type (availability)
      if (searchEmployeeDTO.jobType) {
        qb.andWhere('employee.availability = :jobType', {
          jobType: searchEmployeeDTO.jobType,
        });
      }

      // Experience Level
      if (
        searchEmployeeDTO.experienceLevel &&
        searchEmployeeDTO.experienceLevel !== 'All' &&
        searchEmployeeDTO.experienceLevel !== ''
      ) {
        const mappedExps = [searchEmployeeDTO.experienceLevel];

        // Map modern UI strings to legacy database strings to catch old records
        if (searchEmployeeDTO.experienceLevel === '1 - 2 years') {
          mappedExps.push(
            '1 - 3 years',
            '1+ year',
            '2+ years',
            'More than 2 years',
          );
        } else if (searchEmployeeDTO.experienceLevel === '3 - 5 years') {
          mappedExps.push('1 - 3 years');
        } else if (searchEmployeeDTO.experienceLevel === '6 - 10 years') {
          mappedExps.push('5 - 10 years');
        }

        qb.andWhere('employee.yearsOfExperience IN (:...mappedExps)', {
          mappedExps,
        });
      }

      // Education
      if (
        searchEmployeeDTO.education &&
        searchEmployeeDTO.education.length > 0
      ) {
        qb.andWhere(
          new Brackets((bracket) => {
            searchEmployeeDTO.education.forEach((edu, index) => {
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

      // Dynamic Sort
      const validSortFields = [
        'firstname',
        'lastname',
        'yearsOfExperience',
        'createdAt',
      ];
      const sortField = validSortFields.includes(searchEmployeeDTO.sortBy)
        ? `employee.${searchEmployeeDTO.sortBy}`
        : 'employee.createdAt';
      const sortOrder = ['ASC', 'DESC'].includes(
        searchEmployeeDTO.sortOrder?.toUpperCase(),
      )
        ? searchEmployeeDTO.sortOrder.toUpperCase()
        : 'DESC';

      if (searchEmployeeDTO.sortBy === 'yearsOfExperience') {
        qb.orderBy(
          `CASE "employee"."yearsOfExperience"
            WHEN 'No Experience' THEN 0
            WHEN 'Less than 1 year' THEN 1
            WHEN '1+ year' THEN 2
            WHEN '1 - 2 years' THEN 3
            WHEN '1 - 3 years' THEN 3
            WHEN '2+ years' THEN 4
            WHEN 'More than 2 years' THEN 4
            WHEN '3 - 5 years' THEN 5
            WHEN '5 - 10 years' THEN 6
            WHEN '6 - 10 years' THEN 6
            WHEN '10+ years' THEN 7
            ELSE 8
          END`,
          sortOrder as 'ASC' | 'DESC',
        ).addOrderBy('employee.id', 'ASC');
      } else {
        qb.orderBy(sortField, sortOrder as 'ASC' | 'DESC').addOrderBy(
          'employee.id',
          'ASC',
        );
      }

      const employees = await qb.getMany();

      if (!employees.length) {
        throw new RpcException({
          message: 'No employees found matching your criteria.',
          statusCode: 404,
        });
      }

      const employeesWithUsers = await Promise.all(
        employees.map(async (emp) => {
          const user = await this.userRepo.findOne({
            where: {
              employee: {
                id: emp.id,
              },
            },
          });
          return { employee: emp, userId: user.id };
        }),
      );

      const result = employeesWithUsers.map(
        ({ employee, userId }) =>
          new SearchEmployeeResponseDTO({
            ...employee,
            userId: userId,
          }),
      );

      await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while searching for employees.',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while searching for employees.',
        statusCode: 500,
      });
    }
  }
}
