import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { EReportReason } from '@app/common/database/enums/report-reason.enum';
import { EReportStatus } from '@app/common/database/enums/report-status.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EUserStatus } from '@app/common/database/enums/user-status.enum';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** The admin list pages are the only place that pages over every user. */
export const ADMIN_PAGE_SIZE_MAX = 100;
export const ADMIN_PAGE_SIZE_DEFAULT = 25;

/* ----------------------------- HTTP query DTOs ---------------------------- */
export class AdminListUsersQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_PAGE_SIZE_MAX)
  limit?: number;

  /** Matched against email and phone. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(EUserRole)
  role?: EUserRole;

  @IsOptional()
  @IsEnum(EUserStatus)
  status?: EUserStatus;
}

export class AdminListReportsQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_PAGE_SIZE_MAX)
  limit?: number;

  @IsOptional()
  @IsEnum(EReportStatus)
  status?: EReportStatus;
}

export class AdminListAuditQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_PAGE_SIZE_MAX)
  limit?: number;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}

/* ------------------------------ HTTP body DTOs ---------------------------- */
export class AdminUpdateUserStatusBodyDTO {
  @IsEnum(EUserStatus)
  status: EUserStatus;

  /**
   * Required, and required to be substantial. The reason is shown to the
   * affected user and is the only part of the audit row a human will actually
   * read six months from now; "spam" tells nobody anything.
   */
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;

  /**
   * ISO date. Only meaningful for a suspension; a ban never expires and the
   * service rejects the combination rather than silently ignoring it.
   */
  @IsOptional()
  @IsDateString()
  suspendedUntil?: string;
}

export class AdminListJobsQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_PAGE_SIZE_MAX)
  limit?: number;

  /** Matched against the job title and the company name. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /**
   * Which side of the takedown line to show. Omitted means visible only —
   * the queue an admin works — rather than everything, so a page of hidden
   * postings is something you ask for.
   */
  @IsOptional()
  @IsIn(['visible', 'hidden', 'all'])
  visibility?: 'visible' | 'hidden' | 'all';
}

export class AdminHideJobBodyDTO {
  /**
   * Required and substantial, like a suspension reason: it is shown to the
   * company whose posting was taken down, and it is the only part of the
   * audit row a human will read later.
   */
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}

export class AdminUpdateReportStatusBodyDTO {
  @IsEnum(EReportStatus)
  status: EReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/* ------------------------------- RPC payloads ----------------------------- */
export class AdminListUsersDTO extends AdminListUsersQueryDTO {}

export class AdminGetUserDTO {
  @IsUUID()
  userId: string;
}

export class AdminUpdateUserStatusDTO extends AdminUpdateUserStatusBodyDTO {
  /** The administrator performing the action — recorded in the audit log. */
  @IsUUID()
  actorId: string;

  @IsUUID()
  userId: string;
}

export class AdminListReportsDTO extends AdminListReportsQueryDTO {}

export class AdminUpdateReportStatusDTO extends AdminUpdateReportStatusBodyDTO {
  @IsUUID()
  actorId: string;

  @IsUUID()
  reportId: string;
}

export class AdminListAuditDTO extends AdminListAuditQueryDTO {}

export class AdminListJobsDTO extends AdminListJobsQueryDTO {}

export class AdminHideJobDTO extends AdminHideJobBodyDTO {
  @IsUUID()
  actorId: string;

  @IsUUID()
  jobId: string;
}

export class AdminRestoreJobDTO {
  @IsUUID()
  actorId: string;

  @IsUUID()
  jobId: string;
}

/* -------------------------------- Responses ------------------------------- */
export class AdminUserListItemDTO {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatar: string | null;
  role: EUserRole;
  /** The status as the platform enforces it — an expired suspension reads as active. */
  status: EUserStatus;
  /** The status as stored, so an admin can tell a lapsed suspension from a lifted one. */
  storedStatus: EUserStatus;
  suspendedUntil: Date | null;
  statusReason: string | null;
  isEmailVerified: boolean;
  profileCompleted: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  /** Reports filed against this account that are still pending. */
  openReportCount: number;

  constructor(partial: Partial<AdminUserListItemDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminPagedUsersDTO {
  items: AdminUserListItemDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<AdminPagedUsersDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminUserDetailDTO extends AdminUserListItemDTO {
  employeeId: string | null;
  companyId: string | null;
  lastLoginMethod: string | null;
  reportsAgainst: AdminReportDTO[];
  statusHistory: AdminAuditEntryDTO[];

  constructor(partial: Partial<AdminUserDetailDTO>) {
    super(partial);
    Object.assign(this, partial);
  }
}

export class AdminReportPartyDTO {
  id: string;
  name: string;
  email: string | null;
  role: EUserRole;

  constructor(partial: Partial<AdminReportPartyDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminReportDTO {
  id: string;
  reason: EReportReason;
  details: string | null;
  status: EReportStatus;
  createdAt: Date;
  reporter: AdminReportPartyDTO | null;
  reported: AdminReportPartyDTO | null;

  constructor(partial: Partial<AdminReportDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminPagedReportsDTO {
  items: AdminReportDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<AdminPagedReportsDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminAuditEntryDTO {
  id: string;
  action: EAdminAction;
  actorEmail: string | null;
  targetUserId: string | null;
  targetReportId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;

  constructor(partial: Partial<AdminAuditEntryDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminPagedAuditDTO {
  items: AdminAuditEntryDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<AdminPagedAuditDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminJobListItemDTO {
  id: string;
  title: string;
  companyId: string | null;
  companyName: string;
  location: string | null;
  type: string;
  createdAt: Date;
  expireDate: Date | null;
  /** Null means the posting is live. */
  hiddenAt: Date | null;
  hiddenReason: string | null;
  /** Pending reports against the company that placed it. */
  companyOpenReportCount: number;

  constructor(partial: Partial<AdminJobListItemDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminPagedJobsDTO {
  items: AdminJobListItemDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<AdminPagedJobsDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminOverviewDTO {
  totalUsers: number;
  employees: number;
  companies: number;
  suspendedUsers: number;
  bannedUsers: number;
  pendingReports: number;
  newUsersLast7Days: number;
  liveJobs: number;
  hiddenJobs: number;

  constructor(partial: Partial<AdminOverviewDTO>) {
    Object.assign(this, partial);
  }
}

export class AdminActionResponseDTO {
  message: string;

  constructor(partial: Partial<AdminActionResponseDTO>) {
    Object.assign(this, partial);
  }
}
