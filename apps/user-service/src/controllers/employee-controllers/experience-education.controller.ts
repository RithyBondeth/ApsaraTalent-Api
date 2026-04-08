import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import {
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  IExperienceAndEducationService,
} from '@app/contracts/interfaces/user-service.interface';

import { IRemoveEmployeeItemsController } from '@app/contracts/interfaces/employee-controller.interface';

@Controller()
export class ExperienceAndEducationController implements IRemoveEmployeeItemsController {
  constructor(
    @Inject(I_EXPERIENCE_AND_EDUCATION_SERVICE)
    private readonly experienceAndEducationService: IExperienceAndEducationService,
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
