import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateEmployeeInfoDTO } from '../../dtos/employee/update-employee-info.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';

@Injectable()
export class UpdateEmployeeInfoService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(Social)
    private readonly socialRepository: Repository<Social>,
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    private readonly logger: PinoLogger,
  ) {}

  async updateEmployeeInfo(
    updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
    employeeId: string,
  ): Promise<{ message: string; employee: EmployeeResponseDTO }> {
    try {
      // Find existing employee with relations
      let employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: [
          'skills',
          'experiences',
          'careerScopes',
          'socials',
          'educations',
        ],
      });
      if (!employee)
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);

      // Merge new values into existing fields
      Object.assign(employee, updateEmployeeInfoDTO);

      // Merge and update relations
      if (updateEmployeeInfoDTO.skills) {
        const existingSkills = await this.skillRepository.findBy({
          employees: { id: employeeId },
        });
        const newSkills = updateEmployeeInfoDTO.skills.map((skill) =>
          this.skillRepository.create(skill),
        );
        employee.skills = [...existingSkills, ...newSkills]; // Keep existing skills + add new ones
        await this.skillRepository.save(newSkills); // Save only new skills
      }

      if (updateEmployeeInfoDTO.experiences) {
        const existingExperiences = await this.experienceRepository.findBy({
          employee: { id: employeeId },
        });
        const newExperiences = updateEmployeeInfoDTO.experiences.map((exp) =>
          this.experienceRepository.create(exp),
        );
        employee.experiences = [...existingExperiences, ...newExperiences];
        await this.experienceRepository.save(newExperiences);
      }

      if (updateEmployeeInfoDTO.careerScopes) {
        const existingCareerScopes = await this.careerScopeRepository.findBy({
          employees: { id: employeeId },
        });
        const newCareerScopes = updateEmployeeInfoDTO.careerScopes.map((cs) =>
          this.careerScopeRepository.create(cs),
        );
        employee.careerScopes = [...existingCareerScopes, ...newCareerScopes];
        await this.careerScopeRepository.save(newCareerScopes);
      }

      if (updateEmployeeInfoDTO.socials) {
        const existingSocials = await this.socialRepository.findBy({
          employee: { id: employeeId },
        });
        const newSocials = updateEmployeeInfoDTO.socials.map((social) =>
          this.socialRepository.create(social),
        );
        employee.socials = [...existingSocials, ...newSocials];
        await this.socialRepository.save(newSocials);
      }

      if (updateEmployeeInfoDTO.educations) {
        const existingEducations = await this.educationRepository.findBy({
          employee: { id: employeeId },
        });
        const newEducations = updateEmployeeInfoDTO.educations.map((edu) =>
          this.educationRepository.create(edu),
        );
        employee.educations = [...existingEducations, ...newEducations];
        await this.educationRepository.save(newEducations);
      }

      // Save updated employee entity
      await this.employeeRepository.save(employee);

      return {
        message: 'Employee information updated successfully',
        employee: new EmployeeResponseDTO(employee),
      };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new BadRequestException(
        "An error occurred while updating the employee's information.",
      );
    }
  }
}
