import { EReportReason } from '@app/common/database/enums/report-reason.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/* ----------------------------- HTTP body DTOs ----------------------------- */
export class CreateReportBodyDTO {
  @IsUUID()
  reportedId: string;

  @IsEnum(EReportReason)
  reason: EReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

/* ------------------------------- RPC payloads ----------------------------- */
export class BlockUserDTO {
  @IsUUID()
  blockerId: string;

  @IsUUID()
  blockedId: string;
}

export class UnblockUserDTO {
  @IsUUID()
  blockerId: string;

  @IsUUID()
  blockedId: string;
}

export class ListBlockedUsersDTO {
  @IsUUID()
  blockerId: string;
}

export class GetBlockStatusDTO {
  @IsUUID()
  userId: string;

  @IsUUID()
  otherUserId: string;
}

export class ReportUserDTO {
  @IsUUID()
  reporterId: string;

  @IsUUID()
  reportedId: string;

  @IsEnum(EReportReason)
  reason: EReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

/* ------------------------------- Responses -------------------------------- */
export class BlockActionResponseDTO {
  message: string;
  blocked: boolean;

  constructor(partial: Partial<BlockActionResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class BlockedUserResponseDTO {
  // The blocked user's User.id
  id: string;
  // The blocked user's employee/company profile id (used to filter feeds,
  // which key off employee.id / company.id rather than User.id).
  employeeId: string | null;
  companyId: string | null;
  name: string;
  avatar: string | null;
  role: EUserRole;
  blockedAt: Date;

  constructor(partial: Partial<BlockedUserResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class BlockStatusResponseDTO {
  // true if either side blocked the other (chat should be disabled)
  isBlocked: boolean;
  // current user blocked the other user
  blockedByMe: boolean;
  // the other user blocked the current user
  blockedMe: boolean;

  constructor(partial: Partial<BlockStatusResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ReportUserResponseDTO {
  message: string;
  reportId: string;

  constructor(partial: Partial<ReportUserResponseDTO>) {
    Object.assign(this, partial);
  }
}
