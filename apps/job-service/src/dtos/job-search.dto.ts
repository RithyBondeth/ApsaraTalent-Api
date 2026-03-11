import { Transform } from 'class-transformer';
import {
    IsArray, IsDateString, IsNumber, IsOptional,
    IsString
} from 'class-validator';

export class SearchJobDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
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
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  jobType?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  educationRequired?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt', 'title', or 'companySize'

  @IsOptional()
  @IsString()
  sortOrder?: string; // 'ASC' or 'DESC'
}
