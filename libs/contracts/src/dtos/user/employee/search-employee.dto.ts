import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EmployeeResponseDTO } from '../../shared/user.dto';

export class SearchEmployeeDTO {
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
  jobType?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  education?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: "sortOrder must be 'ASC' or 'DESC'" })
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;
}

export class SearchEmployeeResponseDTO extends EmployeeResponseDTO {
  constructor(partial: Partial<SearchEmployeeResponseDTO>) {
    super(partial);
  }
}

export class SearchEmployeeResult {
  data: SearchEmployeeResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  isUsingFallback: boolean;
}
