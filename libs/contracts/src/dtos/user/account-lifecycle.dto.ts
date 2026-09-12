import { IsUUID } from 'class-validator';

/* --------------------------------- RPC payload ---------------------------- */
/**
 * The current user, addressed by id — every account-lifecycle RPC takes the
 * same shape because none of them has an argument beyond "who is calling".
 */
export class AccountLifecycleUserDTO {
  @IsUUID()
  userId: string;

  constructor(partial: Partial<AccountLifecycleUserDTO>) {
    Object.assign(this, partial);
  }
}

/* ---------------------------------- Responses ----------------------------- */
export class RequestAccountDeletionResponseDTO {
  message: string;
  /** ISO 8601 — when the account will be hard-deleted if not cancelled. */
  scheduledFor: string;

  constructor(partial: Partial<RequestAccountDeletionResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CancelAccountDeletionResponseDTO {
  message: string;

  constructor(partial: Partial<CancelAccountDeletionResponseDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * Everything an account owner is entitled to receive under a "right to
 * data portability" request.
 *
 * Not typed exhaustively — the export is a JSON dump, and typing each
 * collection here would double the maintenance the moment either side of the
 * schema grew a field. A minimal envelope keeps the shape self-describing.
 */
export class AccountDataExportDTO {
  /** ISO 8601 — the moment this dump was generated. */
  exportedAt: string;
  user: Record<string, unknown>;
  employee: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  applications: Array<Record<string, unknown>>;
  interviews: Array<Record<string, unknown>>;
  matches: Array<Record<string, unknown>>;
  favorites: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  notificationPreference: Record<string, unknown> | null;
  problemReports: Array<Record<string, unknown>>;
  loginHistory: Array<Record<string, unknown>>;

  constructor(partial: Partial<AccountDataExportDTO>) {
    Object.assign(this, partial);
  }
}
