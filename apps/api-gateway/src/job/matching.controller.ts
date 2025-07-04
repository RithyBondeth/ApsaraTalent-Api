import { Controller, Inject, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { JOB_SERVICE } from "utils/constants/job-service.constant";

@Controller('match')
export class JobMatchingController {
    constructor(@Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy) {}

    @Post('employee/:eid/like/:cid')
    async employeeLikes(
        @Param('eid', ParseUUIDPipe) eid: string,
        @Param('cid', ParseUUIDPipe) cid: string,
    ) {
        const payload = { eid, cid };
        return firstValueFrom(
            this.jobClient.send(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES, payload)
        )
    }  

    @Post('company/:cid/like/:eid')
    async companyLikes(
        @Param('cid', ParseUUIDPipe) cid: string,
        @Param('eid', ParseUUIDPipe) eid: string,
    ) {
        const payload = { cid, eid };
        return firstValueFrom(
            this.jobClient.send(JOB_SERVICE.ACTIONS.COMPANY_LIKES, payload)
        )
    }

}