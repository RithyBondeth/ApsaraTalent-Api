import { Controller } from "@nestjs/common";
import { ImageCompanyService } from "../../services/company-services/image-company.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller()
export class ImageCompanyController {
    constructor(private readonly imageCompanyService: ImageCompanyService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR)
    async uploadCompanyAvatar(@Payload() paylod: { companyId: string, avatar: Express.Multer.File }) {
       return this.imageCompanyService.uploadCompanyAvatar(paylod.companyId, paylod.avatar);
    }
}