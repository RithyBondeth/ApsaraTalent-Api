import { Injectable } from "@nestjs/common";
import { UpdateCompanyInfoDTO } from "../../dtos/company/update-company-info.dto";

@Injectable()
export class UpdateCompanyInfoService {
    async updateCompanyInfo(updateCompanyInfoDTO: UpdateCompanyInfoDTO, companyId: string) {
        return {
            message: "Hi from update copmpany information",
            data: updateCompanyInfoDTO,
        }
    }  
}