import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Put } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller('user/company')
export class CompanyController {
    constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}
    
    @Get('all')
    async findAll() {
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY, {})
        )
    }

    @Get('one/:companyId')
    async findOneById(@Param('companyId', ParseUUIDPipe) companyId: string) {
        const payload = { companyId };  
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BYID, payload)
        )
    }

    @Put('update-info/:companyId')
    async updateCompanyInfo(
        @Param('companyId') companyId: string,
        @Body() updateCompanyInfoDTO: any
    ) {
        const payload = { companyId, updateCompanyInfoDTO };
        return firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO, payload)
        )
    }
}