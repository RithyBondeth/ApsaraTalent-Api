import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { RpcException } from '@nestjs/microservices';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';

@Injectable()
export class FindEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async findAll(pagination: UserPaginationDTO): Promise<EmployeeResponseDTO[]> {
    const cacheKey = this.redisService.generateListKey('employee', pagination);
    const cached = await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All employees list cache HIT');
      return cached;
    }

    this.logger.info('All employees cache MISS');

    try {
      const employees = await this.employeeRepository.find({
        relations: [
          'skills',
          'careerScopes',
          'experiences',
          'socials',
          'educations',
        ],
        skip: pagination?.skip || 0,
        take: pagination?.limit || 10,
      });
      if (!employees)
        throw new RpcException({
          message: 'There are no employees available',
          statusCode: 404,
        });

      const result = employees.map((emp) => new EmployeeResponseDTO(emp));

      // Cache for 2 minutes
      await this.redisService.set(cacheKey, result, 120000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching all of the employees',
        statusCode: 500,
      });
    }
  }

  async findOneById(employeeId: string): Promise<EmployeeResponseDTO> {
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

      // Cache for 5 minutes
      await this.redisService.set(cacheKey, result, 300000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching an employee',
        statusCode: 500,
      });
    }
  }
}
