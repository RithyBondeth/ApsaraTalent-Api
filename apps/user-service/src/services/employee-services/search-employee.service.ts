import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SearchEmployeeDto } from "../../dtos/employee/search-employee.dto";
import { EmployeeResponseDTO } from "../../dtos/user-response.dto";
import { Employee } from "@app/common/database/entities/employee/employee.entity";
import { RpcException } from "@nestjs/microservices";
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class SearchEmployeeService {
    constructor(
        @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
        private readonly logger: PinoLogger,
    ) {}   

    async searchEmployee(query: SearchEmployeeDto): Promise<EmployeeResponseDTO[]> {
        try {
            const qb = this.employeeRepo.createQueryBuilder("employee")
              .leftJoinAndSelect("employee.skills", "skill")
              .leftJoinAndSelect("employee.careerScopes", "careerScope")
              .leftJoinAndSelect("employee.experiences", "experience")
              .leftJoinAndSelect("employee.educations", "edu");
      
            // Keyword: job title, first name, last name
            if (query.keyword) {
              qb.andWhere(
                `(employee.job ILIKE :keyword OR employee.firstname ILIKE :keyword OR employee.lastname ILIKE :keyword)`,
                { keyword: `%${query.keyword}%` },
              );
            }
      
            // Location
            if (query.location) {
              qb.andWhere("employee.location ILIKE :location", {
                location: `%${query.location}%`,
              });
            }
      
            // Career Scopes
            if (query.careerScopes?.length > 0) {
              qb.andWhere("careerScope.name IN (:...careerScopes)", {
                careerScopes: query.careerScopes,
              });
            }
      
            // Job Type (availability)
            if (query.jobType) {
              qb.andWhere("employee.availability = :jobType", {
                jobType: query.jobType,
              });
            }
      
            // Experience range
            if (query.experienceMin !== undefined) {
              qb.andWhere("employee.yearsOfExperience >= :minExp", {
                minExp: query.experienceMin,
              });
            }
            if (query.experienceMax !== undefined) {
              qb.andWhere("employee.yearsOfExperience <= :maxExp", {
                maxExp: query.experienceMax,
              });
            }
      
            // Education
            if (query.education) {
              qb.andWhere("edu.degree ILIKE :degree", {
                degree: `%${query.education}%`,
              });
            }
      
            // Dynamic Sort
            const validSortFields = ["firstname", "lastname", "yearsOfExperience", "createdAt"];
            const sortField = validSortFields.includes(query.sortBy) ? `employee.${query.sortBy}` : "employee.createdAt";
            const sortOrder = ["ASC", "DESC"].includes(query.sortOrder?.toUpperCase()) ? query.sortOrder.toUpperCase() : "DESC";
      
            qb.orderBy(sortField, sortOrder as "ASC" | "DESC");
      
            const employees = await qb.getMany();
            
            if(!employees.length) {
                throw new RpcException({
                    message: 'No employees found matching your criteria.',
                    statusCode: 404,
                });
            }
            
            return employees.map((emp) => new EmployeeResponseDTO(emp));
          } catch (error) {
            this.logger.error(error, "SearchEmployeeService failed");
            throw new RpcException({
              message: error.message,
              statusCode: 500,
            });
          }
    }       
}