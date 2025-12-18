import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchEmployeeDto } from '../../dtos/employee/search-employee.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { cache } from 'sharp';

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

      // Experience range
      if (query.experienceMin !== undefined) {
        qb.andWhere('employee.yearsOfExperience >= :minExp', {
          minExp: query.experienceMin,
        });
      }
      if (query.experienceMax !== undefined) {
        qb.andWhere('employee.yearsOfExperience <= :maxExp', {
          maxExp: query.experienceMax,
        });
      }

      // Education
      if (query.education) {
        qb.andWhere('edu.degree ILIKE :degree', {
          degree: `%${query.education}%`,
        });
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

      qb.orderBy(sortField, sortOrder as 'ASC' | 'DESC');

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
      this.logger.error(error, 'SearchEmployeeService failed');
      throw new RpcException({
        message: error.message,
        statusCode: 500,
      });
    }
  }
}
