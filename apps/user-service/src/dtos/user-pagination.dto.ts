import { Type } from "class-transformer";
import { IsNumber, IsOptional } from "class-validator";

export class UserPaginationDTO {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    skip: number;
    
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit: number;
}