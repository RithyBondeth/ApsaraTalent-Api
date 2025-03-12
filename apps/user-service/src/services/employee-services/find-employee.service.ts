import { Employee } from "@app/common/database/entities/employee/employee.entiry";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";

@Injectable()
export class FindEmployeeService {
    constructor(
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        private readonly logger: PinoLogger,
    ) {}

    async findAll() {
       try {
            const employees = await this.employeeRepository.find({ relations: ['skills', 'careerScopes', 'experiences', 'socials', 'educations'] });
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