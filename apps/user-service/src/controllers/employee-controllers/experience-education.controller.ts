import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  IExperienceAndEducationService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { IRemoveEmployeeItemsRpcController } from '@app/contracts/interfaces/controller/user-controllers/employee-controller.interface';
import {
  RemoveEmployeeEducationDTO,
  RemoveEmployeeEducationResponseDTO,
  RemoveEmployeeExperienceDTO,
  RemoveEmployeeExperienceResponseDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class ExperienceAndEducationController implements IRemoveEmployeeItemsRpcController {
  constructor(
    @Inject(I_EXPERIENCE_AND_EDUCATION_SERVICE)
    private readonly experienceAndEducationService: IExperienceAndEducationService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE)
  async removeEmployeeExperience(
    @Payload() removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
  ): Promise<RemoveEmployeeExperienceResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeExperience(
      removeEmployeeExperienceDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION)
  async removeEmployeeEducation(
    @Payload() removeEmployeeEducationDTO: RemoveEmployeeEducationDTO,
  ): Promise<RemoveEmployeeEducationResponseDTO> {
    return this.experienceAndEducationService.removeEmployeeEducation(
      removeEmployeeEducationDTO,
    );
  }
}
