import { Controller } from '@nestjs/common';
import { ImageCompanyService } from '../../services/company-services/image-company.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { IImageCompanyController } from '@app/common/interfaces/company.interface';

@Controller()
export class ImageCompanyController implements IImageCompanyController {
  constructor(private readonly imageCompanyService: ImageCompanyService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR)
  async uploadCompanyAvatar(
    @Payload() payload: { companyId: string; avatar: Express.Multer.File },
  ) {
    return this.imageCompanyService.uploadCompanyAvatar(
      payload.companyId,
      payload.avatar,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR)
  async removeCompanyAvatar(@Payload() payload: { companyId: string }) {
    return this.imageCompanyService.removeCompanyAvatar(payload.companyId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER)
  async uploadCompanyCover(
    @Payload() payload: { companyId: string; cover: Express.Multer.File },
  ) {
    return this.imageCompanyService.uploadCompanyCover(
      payload.companyId,
      payload.cover,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER)
  async removeCompanyCover(@Payload() payload: { companyId: string }) {
    return this.imageCompanyService.removeCompanyCover(payload.companyId);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES)
  async uploadCompanyImages(
    @Payload() payload: { companyId: string; images: Express.Multer.File[] },
  ) {
    return this.imageCompanyService.uploadCompanyImage(
      payload.companyId,
      payload.images,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES)
  async removeCompanyImage(@Payload() payload: { imageId: string }) {
    return this.imageCompanyService.removeCompanyImage(payload.imageId);
  }
}
