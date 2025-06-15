import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class SearchJobDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  careerScopes?: string[];

  @IsOptional()
  @IsNumber()
  companySizeMin?: number;

  @IsOptional()
  @IsNumber()
  companySizeMax?: number;

  @IsOptional()
  @IsDateString()
  postedDateFrom?: string;

  @IsOptional()
  @IsDateString()
  postedDateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt', 'title', or 'companySize'

  @IsOptional()
  @IsString()
  sortOrder?: string; // 'ASC' or 'DESC'
}