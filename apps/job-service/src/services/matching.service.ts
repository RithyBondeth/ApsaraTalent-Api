import { Injectable } from "@nestjs/common";
import { MatchDto } from "../dtos/match.dto";

@Injectable()
export class MatchingService {
    
    async employeeLikes(matchDto: MatchDto) {
        console.log("Match Emp: ", matchDto);
        return {
            message: "Employee",
            matchDto,   
        }
    }

    async companyLikes(matchDto: MatchDto) {
        console.log("Match Cmp: ", matchDto);
        return {
            message: "Company",
            matchDto,   
        }
    }
}