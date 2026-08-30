import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EUserStatus } from '@app/common/database/enums/user-status.enum';
import { resolveEffectiveStatus } from '@app/common';
import {
  ADMIN_PAGE_SIZE_DEFAULT,
  ADMIN_PAGE_SIZE_MAX,
  AdminReportDTO,
  AdminReportPartyDTO,
  AdminUserListItemDTO,
} from '@app/contracts/dtos/user';

/**
 * Pure shaping helpers for the admin surface. They live here rather than
 * beside the services because both admin services use them, and the repo keeps
 * `services/` for services only.
 */

/** Employee first/last name, company name, or a stable placeholder. */
export function resolveDisplayName(user: User | null | undefined): string {
  if (!user) return 'Unknown';
  if (user.employee) {
    return (
      [user.employee.firstname, user.employee.lastname]
        .filter(Boolean)
        .join(' ') || 'Unnamed employee'
    );
  }
  if (user.company) return user.company.name || 'Unnamed company';
  // Admins have neither profile; the email is the only name they have.
  return user.email ?? 'Unknown';
}

export function resolveAvatar(user: User | null | undefined): string | null {
  return user?.employee?.avatar || user?.company?.avatar || null;
}

/**
 * Clamp caller-supplied paging. `limit` is validated at the DTO too, but this
 * runs on the RPC payload, which a gateway bug could hand through unchecked.
 */
export function resolvePaging(query: { page?: number; limit?: number }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const limit = Math.min(
    ADMIN_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(query.limit ?? ADMIN_PAGE_SIZE_DEFAULT)),
  );
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Both statuses are reported deliberately.
 *
 * `status` is what the platform enforces right now — a lapsed suspension reads
 * as active. `storedStatus` is the row as written. Showing only the first
 * would make a served-out suspension indistinguishable from one an admin
 * lifted; showing only the second would contradict what the user experiences.
 */
export function toAdminUserListItem(
  user: User,
  openReportCount = 0,
): AdminUserListItemDTO {
  return new AdminUserListItemDTO({
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    name: resolveDisplayName(user),
    avatar: resolveAvatar(user),
    role: user.role,
    status: resolveEffectiveStatus(user),
    storedStatus: user.status ?? EUserStatus.ACTIVE,
    suspendedUntil: user.suspendedUntil ?? null,
    statusReason: user.statusReason ?? null,
    isEmailVerified: user.isEmailVerified,
    profileCompleted: user.profileCompleted,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    openReportCount,
  });
}

function toReportParty(user: User | null): AdminReportPartyDTO | null {
  if (!user) return null;
  return new AdminReportPartyDTO({
    id: user.id,
    name: resolveDisplayName(user),
    email: user.email ?? null,
    role: user.role,
  });
}

export function toAdminReport(report: UserReport): AdminReportDTO {
  return new AdminReportDTO({
    id: report.id,
    reason: report.reason,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt,
    reporter: toReportParty(report.reporter ?? null),
    reported: toReportParty(report.reported ?? null),
  });
}
