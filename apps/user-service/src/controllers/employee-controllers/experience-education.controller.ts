import { Controller } from '@nestjs/common';
import { ExperienceAndEducationService } from '../../services/employee-services/experienc-education.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller()
export class ExperienceAndEducationController {
  constructor(
    private readonly experienceAndEducationService: ExperienceAndEducationService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE)
  async removeEmployeeExperience(
    @Payload() payload: { employeeId: string; experienceId: string },
  ) {
    return this.experienceAndEducationService.removeEmployeeExperience(
      payload.employeeId,
      payload.experienceId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION)
  async removeEmployeeEducation(
    @Payload() payload: { employeeId: string; educationId: string },
  ) {
    return this.experienceAndEducationService.removeEmployeeEducation(
      payload.employeeId,
      payload.educationId,
    );
  }
}
