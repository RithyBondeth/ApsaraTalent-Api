import { Type } from 'class-transformer';
import {
  Allow,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { CoreResponseDTO } from '../../shared/core-response.dto';
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
  @Allow()
  avatar: Express.Multer.File;
}

export class UploadEmployeeResumeDTO extends EmployeeIdDTO {
  @Allow()
  resume: Express.Multer.File;
}

export class UploadEmployeeCoverLetterDTO extends EmployeeIdDTO {
  @Allow()
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

export class UploadEmployeeAvatarResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadEmployeeAvatarResponseDTO>) {
    super(partial);
  }
}

export class RemoveEmployeeAvatarResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveEmployeeAvatarResponseDTO>) {
    super(partial);
  }
}

export class UploadEmployeeResumeResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadEmployeeResumeResponseDTO>) {
    super(partial);
  }
}

export class RemoveEmployeeResumeResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveEmployeeResumeResponseDTO>) {
    super(partial);
  }
}

export class UploadEmployeeCoverLetterResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadEmployeeCoverLetterResponseDTO>) {
    super(partial);
  }
}

export class RemoveEmployeeCoverLetterResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveEmployeeCoverLetterResponseDTO>) {
    super(partial);
  }
}

export class RemoveEmployeeEducationResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveEmployeeEducationResponseDTO>) {
    super(partial);
  }
}

export class RemoveEmployeeExperienceResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveEmployeeExperienceResponseDTO>) {
    super(partial);
  }
}
