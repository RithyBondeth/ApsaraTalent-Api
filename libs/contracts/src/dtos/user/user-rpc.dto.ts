import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDTO } from '../shared';
import { UpdateCompanyInfoDTO } from './update-company-info.dto';
import { UpdateEmployeeInfoDTO } from './update-employee-info.dto';

export class UserIdDTO {
  @IsUUID()
  userId: string;
}

export class EmployeeIdDTO {
  @IsUUID()
  employeeId: string;
}

export class CompanyIdDTO {
  @IsUUID()
  companyId: string;
}

export class UpdatePushNotificationTokenBodyDTO {
  @IsOptional()
  @IsString()
  token?: string | null;
}

export class UpdatePushNotificationTokenDTO extends UserIdDTO {
  @IsOptional()
  @IsString()
  token?: string | null;
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

export class CompanyEmployeeFavoriteDTO {
  @IsUUID()
  cid: string;

  @IsUUID()
  eid: string;
}

export class CompanyEmployeeFavoriteWithFavoriteIdDTO extends CompanyEmployeeFavoriteDTO {
  @IsUUID()
  favoriteId: string;
}

export class EmployeeFavoriteLookupDTO {
  @IsUUID()
  eid: string;
}

export class CompanyFavoriteLookupDTO {
  @IsUUID()
  cid: string;
}

export class EmployeeRecommendationsDTO extends EmployeeIdDTO {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CompanyRecommendationsDTO extends CompanyIdDTO {
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

export class UpdateCompanyInfoRequestDTO extends CompanyIdDTO {
  @ValidateNested()
  @Type(() => UpdateCompanyInfoDTO)
  updateCompanyInfoDTO: UpdateCompanyInfoDTO;
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

export class UploadCompanyAvatarDTO extends CompanyIdDTO {
  avatar: Express.Multer.File;
}

export class UploadCompanyCoverDTO extends CompanyIdDTO {
  cover: Express.Multer.File;
}

export class UploadCompanyImagesDTO extends CompanyIdDTO {
  images: Express.Multer.File[];
}

export class RemoveCompanyImageDTO extends CompanyIdDTO {
  @IsUUID()
  imageId: string;
}

export class RemoveOpenPositionDTO extends CompanyIdDTO {
  @IsUUID()
  opId: string;
}

export class PaginationRequestDTO extends PaginationDTO {}
