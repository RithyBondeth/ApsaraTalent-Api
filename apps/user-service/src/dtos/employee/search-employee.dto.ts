import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class SearchEmployeeDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  careerScopes?: string[];

  @IsOptional()
  @IsString()
  jobType?: string; // e.g., full_time, part_time

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  education?: string[]; // e.g., Bachelor, Master, PhD

  @IsOptional()
  @IsString()
  sortBy?: string; // e.g., createdAt, job

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: "sortOrder must be 'ASC' or 'DESC'" })
  sortOrder?: 'ASC' | 'DESC';
}
