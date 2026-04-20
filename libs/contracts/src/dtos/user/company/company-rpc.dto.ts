import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdateCompanyInfoDTO } from './update-company-info.dto';

export class CompanyIdDTO {
  @IsUUID()
  companyId: string;
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

export class CompanyFavoriteLookupDTO {
  @IsUUID()
  cid: string;
}

export class CompanyRecommendationsDTO extends CompanyIdDTO {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class UpdateCompanyInfoRequestDTO extends CompanyIdDTO {
  @ValidateNested()
  @Type(() => UpdateCompanyInfoDTO)
  updateCompanyInfoDTO: UpdateCompanyInfoDTO;
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
