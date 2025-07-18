import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SearchTemplateDTO {
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isPremium: boolean;
  
  @IsString()
  @IsOptional()
  title: string;
}