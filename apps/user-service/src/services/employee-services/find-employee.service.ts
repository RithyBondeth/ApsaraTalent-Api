import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  EmployeeIdDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IFindEmployeeService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

@Injectable()
export class FindEmployeeService implements IFindEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async findAll(paginationDTO: PaginationDTO): Promise<EmployeeResponseDTO[]> {
    const { skip = 0, limit = 10 } = paginationDTO;
    const cacheKey = this.redisService.generateListKey('employee', {
      skip,
      limit,
    });
    const cached = await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All employees list cache HIT');
      return cached;
    }

    this.logger.info('All employees cache MISS');

    try {
      const employees = await this.employeeRepository.find({
        where: { isHide: false },
        relations: [
          'skills',
          'careerScopes',
          'experiences',
          'socials',
          'educations',
        ],
        skip,
        take: limit,
      });
      if (!employees)
        throw new RpcException({
          message: 'There are no employees available',
          statusCode: 404,
        });

      const result = employees.map((emp) => new EmployeeResponseDTO(emp));

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching all of the employees',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while fetching all of the employees',
        statusCode: 500,
      });
    }
  }

  async findOneById(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<EmployeeResponseDTO> {
    const { employeeId } = employeeIdDTO;
    const cacheKey = this.redisService.generateEmployeeKey(
      'detail',
      employeeId,
    );
    const cached = await this.redisService.get<EmployeeResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${employeeId} cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${employeeId} cache MISS`);

    try {
      const user = await this.userRepository.findOne({
        where: {
          employee: {
            id: employeeId,
          },
        },
        relations: [
          'employee.skills',
          'employee.careerScopes',
          'employee.experiences',
          'employee.socials',
          'employee.educations',
        ],
      });
      const result = new EmployeeResponseDTO({
        ...user.employee,
        email: user.email,
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching an employee',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while fetching an employee',
        statusCode: 500,
      });
    }
  }

  async countAllEmployees(): Promise<CountAllUsersResponseDTO> {
    const cacheKey = 'apsaratalent:user-service:employee:count:all';
    const cached =
      await this.redisService.get<CountAllUsersResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info('All employees count cache HIT');
      return cached;
    }

    this.logger.info('All employees count cache MISS');

    try {
      const totalEmployees = await this.employeeRepository.count({ where: { isHide: false } });
      const result = { totalEmployees };

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return new CountAllUsersResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting all employees',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while counting all employees',
        statusCode: 500,
      });
    }
  }
}
