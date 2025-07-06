import { Controller } from "@nestjs/common";
import { MatchingService } from "../services/matching.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { JOB_SERVICE } from "utils/constants/job-service.constant";
import { IMatchingController } from "@app/common/interfaces/job-controller.interface";

@Controller()
export class MatchingController implements IMatchingController {
    constructor(private readonly matchingService: MatchingService) {}

    @MessagePattern(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES) 
    async employeeLikes(@Payload() payload: any) {
        return this.matchingService.employeeLikes(payload);
    }  

    @MessagePattern(JOB_SERVICE.ACTIONS.COMPANY_LIKES)
    async companyLikes(@Payload() payload: any) {
        return this.matchingService.companyLikes(payload);
    }
}