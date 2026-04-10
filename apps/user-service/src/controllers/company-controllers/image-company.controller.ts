import { IImageCompanyController } from '@app/contracts/interfaces/company.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_IMAGE_COMPANY_SERVICE,
  IImageCompanyService,
} from '@app/contracts/interfaces/user-service.interface';

@Controller()
export class ImageCompanyController implements IImageCompanyController {
  constructor(
    @Inject(I_IMAGE_COMPANY_SERVICE)
    private readonly imageCompanyService: IImageCompanyService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR)
  async uploadCompanyAvatar(
    @Payload() payload: { companyId: string; avatar: Express.Multer.File },
  ): Promise<any> {
    return this.imageCompanyService.uploadCompanyAvatar(
      payload.companyId,
      payload.avatar,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR)
  async removeCompanyAvatar(
    @Payload() payload: { companyId: string },
  ): Promise<any> {
    return this.imageCompanyService.removeCompanyAvatar(payload.companyId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER)
  async uploadCompanyCover(
    @Payload() payload: { companyId: string; cover: Express.Multer.File },
  ): Promise<any> {
    return this.imageCompanyService.uploadCompanyCover(
      payload.companyId,
      payload.cover,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER)
  async removeCompanyCover(
    @Payload() payload: { companyId: string },
  ): Promise<any> {
    return this.imageCompanyService.removeCompanyCover(payload.companyId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES)
  async uploadCompanyImages(
    @Payload() payload: { companyId: string; images: Express.Multer.File[] },
  ): Promise<any> {
    return this.imageCompanyService.uploadCompanyImage(
      payload.companyId,
      payload.images,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES)
  async removeCompanyImage(
    @Payload() payload: { companyId: string; imageId: string },
  ): Promise<any> {
    return this.imageCompanyService.removeCompanyImage(
      payload.companyId,
      payload.imageId,
    );
  }
}
