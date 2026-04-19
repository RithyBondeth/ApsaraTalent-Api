import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';
import {
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  IExperienceAndEducationService,
} from '@app/contracts/interfaces/service/user-service.interface';

import { IRemoveEmployeeItemsController } from '@app/contracts/interfaces/controller/employee-controller.interface';

@Controller()
export class ExperienceAndEducationController implements IRemoveEmployeeItemsController {
  constructor(
    @Inject(I_EXPERIENCE_AND_EDUCATION_SERVICE)
    private readonly experienceAndEducationService: IExperienceAndEducationService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE)
  async removeEmployeeExperience(
    @Payload() payload: { employeeId: string; experienceId: string },
  ): Promise<CoreResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeExperience(
      payload.employeeId,
      payload.experienceId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION)
  async removeEmployeeEducation(
    @Payload() payload: { employeeId: string; educationId: string },
  ): Promise<CoreResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeEducation(
      payload.employeeId,
      payload.educationId,
    );
  }
}
