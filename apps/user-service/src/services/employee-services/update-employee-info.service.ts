import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateEmployeeInfoDTO } from "../../dtos/employee/update-employee-info.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Employee } from "@app/common/database/entities/employee/employee.entiry";
import { Repository } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { Skill } from "@app/common/database/entities/employee/skill.entity";
import { Experience } from "@app/common/database/entities/employee/experince.entity";
import { CareerScope } from "@app/common/database/entities/career-scope.entity";
import { Social } from "@app/common/database/entities/social.entity";
import { Education } from "@app/common/database/entities/employee/education.entity";

@Injectable()
export class UpdateEmployeeInfoService {
    constructor(
        @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
        @InjectRepository(Skill) private readonly skillRepository: Repository<Skill>,
        @InjectRepository(Experience) private readonly experienceRepository: Repository<Experience>,
        @InjectRepository(CareerScope) private readonly careerScopeRepository: Repository<CareerScope>,
        @InjectRepository(Social) private readonly socialRepository: Repository<Social>,
        @InjectRepository(Education) private readonly educationRepository: Repository<Education>,
        private readonly logger: PinoLogger,
    ) {}

    async updateEmployeeInfo(updateEmployeeInfoDTO: UpdateEmployeeInfoDTO, employeeId: string) {
        try {
            // ✅ Find Employee with relations
            let employee = await this.employeeRepository.findOne({ 
                where: { id: employeeId }, 
                relations: ['skills', 'experiences', 'careerScopes', 'socials', 'educations'],
            });
    
            if (!employee) throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    
            // ✅ Update employee's basic fields (if provided)
            Object.assign(employee, updateEmployeeInfoDTO);
    
            // ✅ Update or Add New Skills (Prevent Duplication)
            if (updateEmployeeInfoDTO.skills) {
                for (const skillData of updateEmployeeInfoDTO.skills) {
                    let skill = await this.skillRepository.findOne({ where: { name: skillData.name } });
    
                    if (!skill) {
                        skill = this.skillRepository.create(skillData);
                        await this.skillRepository.save(skill);
                    }
    
                    if (!employee.skills.some(s => s.name === skill.name)) {
                        employee.skills.push(skill);
                    }
                }
            }
    
            // ✅ Update or Add New Experiences (Prevent Duplication)
            if (updateEmployeeInfoDTO.experiences) {
                for (const expData of updateEmployeeInfoDTO.experiences) {
                    const experience = this.experienceRepository.create({ ...expData, employee });
                    await this.experienceRepository.save(experience);
                }
            }
    
            // ✅ Update or Add New Career Scopes (Prevent Duplication)
            if (updateEmployeeInfoDTO.careerScopes) {
                for (const careerScopeData of updateEmployeeInfoDTO.careerScopes) {
                    let careerScope = await this.careerScopeRepository.findOne({ where: { name: careerScopeData.name } });
    
                    if (!careerScope) {
                        careerScope = this.careerScopeRepository.create(careerScopeData);
                        await this.careerScopeRepository.save(careerScope);
                    }
    
                    if (!employee.careerScopes.some(cs => cs.name === careerScope.name)) {
                        employee.careerScopes.push(careerScope);
                    }
                }
            }
    
            // ✅ Update or Add New Socials (Prevent Duplication)
            if (updateEmployeeInfoDTO.socials) {
                for (const socialData of updateEmployeeInfoDTO.socials) {
                    const social = this.socialRepository.create({ ...socialData, employee });
                    await this.socialRepository.save(social);
                }
            }
    
            // ✅ Update or Add New Educations (Prevent Duplication)
            if (updateEmployeeInfoDTO.educations) {
                for (const eduData of updateEmployeeInfoDTO.educations) {
                    const education = this.educationRepository.create({ ...eduData, employee });
                    await this.educationRepository.save(education);
                }
            }
    
            // ✅ Save the updated employee entity
            await this.employeeRepository.save(employee);
    
            return {
                message: "Employee information updated successfully",
                employee,
            };
        } catch (error) {  
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while updating the employee's information.");
        }
    }
}