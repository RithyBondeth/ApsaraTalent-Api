import { Controller } from "@nestjs/common";
import { FindCompanyService } from "../../services/company-services/find-company.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller()
export class FindCompanyController {
    constructor(private readonly findCompanyService: FindCompanyService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY) 
    async findAll() {
        return this.findCompanyService.findAll();
    }

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID)
    async findOne(@Payload() payload: { companyId: string }) {
        return this.findCompanyService.findOneById(payload.companyId);
    }
} 