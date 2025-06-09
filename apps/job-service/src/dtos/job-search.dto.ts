import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class SearchJobDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  companySizeMin?: number;

  @IsOptional()
  @IsNumber()
  companySizeMax?: number;

  @IsOptional()
  @IsDateString()
  postedDateFrom?: Date;

  @IsOptional()
  @IsDateString()
  postedDateTo?: Date;

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt', 'title', or 'companySize'

  @IsOptional()
  @IsString()
  sortOrder?: string; // 'ASC' or 'DESC'
}