import { IImageCompanyRpcController } from '@app/contracts/interfaces/controller/company-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_IMAGE_COMPANY_SERVICE,
  IImageCompanyService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';
import {
  CompanyIdDTO,
  RemoveCompanyImageDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyCoverDTO,
  UploadCompanyImagesDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class ImageCompanyController implements IImageCompanyRpcController {
  constructor(
    @Inject(I_IMAGE_COMPANY_SERVICE)
    private readonly imageCompanyService: IImageCompanyService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR)
  async uploadCompanyAvatar(
    @Payload() uploadCompanyAvatarDTO: UploadCompanyAvatarDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.uploadCompanyAvatar(uploadCompanyAvatarDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR)
  async removeCompanyAvatar(
    @Payload() companyIdDTO: CompanyIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.removeCompanyAvatar(companyIdDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER)
  async uploadCompanyCover(
    @Payload() uploadCompanyCoverDTO: UploadCompanyCoverDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.uploadCompanyCover(uploadCompanyCoverDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER)
  async removeCompanyCover(
    @Payload() companyIdDTO: CompanyIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.removeCompanyCover(companyIdDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES)
  async uploadCompanyImages(
    @Payload() uploadCompanyImagesDTO: UploadCompanyImagesDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.uploadCompanyImages(uploadCompanyImagesDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES)
  async removeCompanyImage(
    @Payload() removeCompanyImageDTO: RemoveCompanyImageDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageCompanyService.removeCompanyImage(removeCompanyImageDTO);
  }
}
