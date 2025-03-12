import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";
import { UpdateCompanyInfoService } from "../../services/company-services/update-company-info.service";
import { UpdateCompanyInfoDTO } from "../../dtos/company/update-company-info.dto";

@Controller()
export class UpdateCompanyInfoController {
    constructor(private readonly updateCompanyInfoService: UpdateCompanyInfoService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO)
    async updateCompanyInfo(@Payload() payload: { updateCompanyInfoDTO: UpdateCompanyInfoDTO, companyId: string }) {
        this.updateCompanyInfoService.updateCompanyInfo(payload.updateCompanyInfoDTO, payload.companyId);
    }
}