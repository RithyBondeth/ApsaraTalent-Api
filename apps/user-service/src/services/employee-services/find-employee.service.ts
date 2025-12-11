import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { RpcException } from '@nestjs/microservices';
import { User } from '@app/common/database/entities/user.entity';

@Injectable()
export class FindEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
  ) {}

  async findAll(pagination: UserPaginationDTO): Promise<EmployeeResponseDTO[]> {
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

      return employees.map((emp) => new EmployeeResponseDTO(emp));
    } catch (error) {
      //Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching all of the employees',
        statusCode: 500,
      });
    }
  }

  async findOneById(employeeId: string): Promise<EmployeeResponseDTO> {
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
      return new EmployeeResponseDTO({
        ...user.employee,
        email: user.email,
      });
    } catch (error) {
      //Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: 'An error occurred while fetching an employee',
        statusCode: 500,
      });
    }
  }
}
