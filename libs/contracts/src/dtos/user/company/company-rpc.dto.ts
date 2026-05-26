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

export class UpdateCompanyInfoRpcDTO extends CompanyIdDTO {
  @ValidateNested()
  @Type(() => UpdateCompanyInfoDTO)
  updateCompanyInfoDTO: UpdateCompanyInfoDTO;
}

export class UploadCompanyAvatarDTO extends CompanyIdDTO {
  @Allow()
  avatar: Express.Multer.File;
}

export class UploadCompanyCoverDTO extends CompanyIdDTO {
  @Allow()
  cover: Express.Multer.File;
}

export class UploadCompanyImagesDTO extends CompanyIdDTO {
  @Allow()
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

export class UploadCompanyAvatarResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadCompanyAvatarResponseDTO>) {
    super(partial);
  }
}

export class RemoveCompanyAvatarResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveCompanyAvatarResponseDTO>) {
    super(partial);
  }
}

export class UploadCompanyCoverResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadCompanyCoverResponseDTO>) {
    super(partial);
  }
}

export class RemoveCompanyCoverResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveCompanyCoverResponseDTO>) {
    super(partial);
  }
}

export class UploadCompanyImagesResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UploadCompanyImagesResponseDTO>) {
    super(partial);
  }
}

export class RemoveCompanyImageResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveCompanyImageResponseDTO>) {
    super(partial);
  }
}

export class RemoveOpenPositionResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<RemoveOpenPositionResponseDTO>) {
    super(partial);
  }
}
