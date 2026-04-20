import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateEmployeeInfoDTO } from './update-employee-info.dto';

export class EmployeeIdDTO {
  @IsUUID()
  employeeId: string;
}

export class EmployeeCompanyFavoriteDTO {
  @IsUUID()
  eid: string;

  @IsUUID()
  cid: string;
}

export class EmployeeCompanyFavoriteWithFavoriteIdDTO extends EmployeeCompanyFavoriteDTO {
  @IsUUID()
  favoriteId: string;
}

export class EmployeeFavoriteLookupDTO {
  @IsUUID()
  eid: string;
}

export class EmployeeRecommendationsDTO extends EmployeeIdDTO {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class UpdateEmployeeInfoRequestDTO extends EmployeeIdDTO {
  @ValidateNested()
  @Type(() => UpdateEmployeeInfoDTO)
  updateEmployeeInfoDTO: UpdateEmployeeInfoDTO;
}

export class UploadEmployeeAvatarDTO extends EmployeeIdDTO {
  avatar: Express.Multer.File;
}

export class UploadEmployeeResumeDTO extends EmployeeIdDTO {
  resume: Express.Multer.File;
}

export class UploadEmployeeCoverLetterDTO extends EmployeeIdDTO {
  coverLetter: Express.Multer.File;
}

export class RemoveEmployeeEducationDTO extends EmployeeIdDTO {
  @IsUUID()
  educationId: string;
}

export class RemoveEmployeeExperienceDTO extends EmployeeIdDTO {
  @IsUUID()
  experienceId: string;
}
