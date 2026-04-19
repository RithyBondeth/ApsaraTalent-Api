import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';
import {
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  IExperienceAndEducationService,
} from '@app/contracts/interfaces/service/user-service.interface';

import { IRemoveEmployeeItemsRpcController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import {
  RemoveEmployeeEducationDTO,
  RemoveEmployeeExperienceDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class ExperienceAndEducationController implements IRemoveEmployeeItemsRpcController {
  constructor(
    @Inject(I_EXPERIENCE_AND_EDUCATION_SERVICE)
    private readonly experienceAndEducationService: IExperienceAndEducationService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE)
  async removeEmployeeExperience(
    @Payload() payload: RemoveEmployeeExperienceDTO,
  ): Promise<CoreResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeExperience(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION)
  async removeEmployeeEducation(
    @Payload() payload: RemoveEmployeeEducationDTO,
  ): Promise<CoreResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeEducation(payload);
  }
}
