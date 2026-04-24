import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CoreResponseDTO } from '../shared/core-response.dto';
import { CompanyResponseDTO, EmployeeResponseDTO } from '../shared/user.dto';

export class UserIdDTO {
  @IsUUID()
  userId: string;
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

export class UpdatePushNotificationTokenResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<UpdatePushNotificationTokenResponseDTO>) {
    super(partial);
  }
}

export class EmployeeFavoriteCompanyResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<EmployeeFavoriteCompanyResponseDTO>) {
    super(partial);
  }
}

export class EmployeeUnfavoriteCompanyResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<EmployeeUnfavoriteCompanyResponseDTO>) {
    super(partial);
  }
}

export class CompanyFavoriteEmployeeResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<CompanyFavoriteEmployeeResponseDTO>) {
    super(partial);
  }
}

export class CompanyUnfavoriteEmployeeResponseDTO extends CoreResponseDTO {
  constructor(partial: Partial<CompanyUnfavoriteEmployeeResponseDTO>) {
    super(partial);
  }
}

export class EmployeeFavoritesListItemDTO {
  id: string;
  createdAt: string;
  userId: string;
  company: CompanyResponseDTO;

  constructor(partial: Partial<EmployeeFavoritesListItemDTO>) {
    Object.assign(this, partial);
  }
}

export class CompanyFavoritesListItemDTO {
  id: string;
  createdAt: string;
  userId: string;
  employee: EmployeeResponseDTO;

  constructor(partial: Partial<CompanyFavoritesListItemDTO>) {
    Object.assign(this, partial);
  }
}
