import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Brackets, Repository } from 'typeorm';
import { SearchEmployeeDto } from '../../dtos/employee/search-employee.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';

@Injectable()
export class SearchEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async searchEmployee(
    query: SearchEmployeeDto,
  ): Promise<EmployeeResponseDTO[]> {
    const cacheKey = this.redisService.generateSearchKey('employee', query);
    const cached = await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);

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
        .leftJoinAndSelect('employee.educations', 'edu');

      // Keyword: job title, first name, last name
      if (query.keyword) {
        qb.andWhere(
          `(employee.job ILIKE :keyword OR employee.firstname ILIKE :keyword OR employee.lastname ILIKE :keyword)`,
          { keyword: `%${query.keyword}%` },
        );
      }

      // Location
      if (query.location) {
        qb.andWhere('employee.location ILIKE :location', {
          location: `%${query.location}%`,
        });
      }

      // Career Scopes
      if (query.careerScopes?.length > 0) {
        qb.andWhere('careerScope.name IN (:...careerScopes)', {
          careerScopes: query.careerScopes,
        });
      }

      // Job Type (availability)
      if (query.jobType) {
        qb.andWhere('employee.availability = :jobType', {
          jobType: query.jobType,
        });
      }

      // Experience Level
      if (
        query.experienceLevel &&
        query.experienceLevel !== 'All' &&
        query.experienceLevel !== ''
      ) {
        const mappedExps = [query.experienceLevel];

        // Map modern UI strings to legacy database strings to catch old records
        if (query.experienceLevel === '1 - 2 years') {
          mappedExps.push(
            '1 - 3 years',
            '1+ year',
            '2+ years',
            'More than 2 years',
          );
        } else if (query.experienceLevel === '3 - 5 years') {
          mappedExps.push('1 - 3 years');
        } else if (query.experienceLevel === '6 - 10 years') {
          mappedExps.push('5 - 10 years');
        }

        qb.andWhere('employee.yearsOfExperience IN (:...mappedExps)', {
          mappedExps,
        });
      }

      // Education
      if (query.education && query.education.length > 0) {
        qb.andWhere(
          new Brackets((bracket) => {
            query.education.forEach((edu, index) => {
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
      const sortField = validSortFields.includes(query.sortBy)
        ? `employee.${query.sortBy}`
        : 'employee.createdAt';
      const sortOrder = ['ASC', 'DESC'].includes(query.sortOrder?.toUpperCase())
        ? query.sortOrder.toUpperCase()
        : 'DESC';

      if (query.sortBy === 'yearsOfExperience') {
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
        );
      } else {
        qb.orderBy(sortField, sortOrder as 'ASC' | 'DESC');
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
          new EmployeeResponseDTO({
            ...employee,
            userId: userId,
          }),
      );

      // Cache search results for 1 minute (shorter because search is frequent)
      await this.redisService.set(cacheKey, result, 60000);

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
