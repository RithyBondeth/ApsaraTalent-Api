import { Employee } from "@app/common/database/entities/employee/employee.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { UserPaginationDTO } from "../../dtos/user-pagination.dto";

@Injectable()
export class FindEmployeeService {
    constructor(
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        private readonly logger: PinoLogger,
    ) {}

    async findAll(pagination: UserPaginationDTO) {
       try {
            const employees = await this.employeeRepository.find({ 
                relations: ['skills', 'careerScopes', 'experiences', 'socials', 'educations'],
                skip: pagination?.skip || 0,
                take: pagination?.limit || 10,
            });
            if(!employees) throw new NotFoundException('There are no employee available');

            return employees;
       } catch (error) {
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching all of the employees");
       }
    }

    async findOneById(employeeId: string) {
        try {  
            const employee = await this.employeeRepository.findOne({
                where: { id: employeeId },
                relations: ['skills', 'careerScopes', 'experiences', 'socials', 'educations']
            });

            return employee;
        } catch (error) {
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching an employee");
        }
    }

}