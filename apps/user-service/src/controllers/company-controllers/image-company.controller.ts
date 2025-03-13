import { Controller } from "@nestjs/common";
import { ImageCompanyService } from "../../services/company-services/image-company.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller()
export class ImageCompanyController {
    constructor(private readonly imageCompanyService: ImageCompanyService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR)
    async uploadCompanyAvatar(@Payload() payload: { companyId: string, avatar: Express.Multer.File }) {
       return this.imageCompanyService.uploadCompanyAvatar(payload.companyId, payload.avatar);
    }

    @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR)
    async removeCompanyAvatar(@Payload() payload: { companyId: string }) {
        return this.imageCompanyService.removeCompanyAvatar(payload.companyId);
    }

    @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER)
    async uploadCompanyCover(@Payload() payload: { companyId: string, cover: Express.Multer.File }) {
        return this.imageCompanyService.uploadCompanyCover(payload.companyId, payload.cover);
    }
}