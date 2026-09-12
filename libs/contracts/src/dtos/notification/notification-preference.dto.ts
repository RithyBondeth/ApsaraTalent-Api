import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import { ENotificationChannel } from '@app/common/database/enums/notification-channel.enum';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/** Per-category channel switches, fully resolved — no partials, no gaps. */
export type TResolvedCategoryPreferences = Record<
  ENotificationCategory,
  Record<ENotificationChannel, boolean>
>;

/* ----------------------------- HTTP body DTOs ----------------------------- */
export class UpdateNotificationPreferenceBodyDTO {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  /**
   * Validated only as "an object" here. The category and channel keys are
   * checked against the enums in `NotificationPreferenceService.update`, which
   * drops anything it does not recognize — doing it there rather than with a
   * nested validator keeps one place responsible for what may be written to
   * the jsonb column, instead of two that can disagree.
   */
  @IsOptional()
  @IsObject()
  categories?: Partial<
    Record<
      ENotificationCategory,
      Partial<Record<ENotificationChannel, boolean>>
    >
  >;
}

export class UnsubscribeBodyDTO {
  // Hex, and exactly the length the service mints. Anything else cannot match
  // a stored token, so it is rejected before it reaches a database lookup.
  @IsString()
  @IsNotEmpty()
  @Length(48, 48)
  @Matches(/^[0-9a-f]+$/)
  token: string;
}

/* ------------------------------- RPC payloads ----------------------------- */
export class NotificationPreferenceUserDTO {
  userId: string;

  constructor(partial: Partial<NotificationPreferenceUserDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * A user's preferences as the settings page sees them: every category present,
 * defaults already merged in. The absence of a stored row is not visible here
 * on purpose — the UI should render the same switches either way.
 */
export class NotificationPreferenceResponseDTO {
  emailEnabled: boolean;
  pushEnabled: boolean;
  categories: TResolvedCategoryPreferences;

  constructor(partial: Partial<NotificationPreferenceResponseDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * A partial update. Anything omitted is left as it was, so the settings page
 * can send one toggle rather than restating the whole object and racing with
 * another tab.
 */
export class UpdateNotificationPreferenceDTO {
  userId: string;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  categories?: Partial<
    Record<
      ENotificationCategory,
      Partial<Record<ENotificationChannel, boolean>>
    >
  >;

  constructor(partial: Partial<UpdateNotificationPreferenceDTO>) {
    Object.assign(this, partial);
  }
}

/* ------------------------------- Responses -------------------------------- */
export class UnsubscribeDTO {
  token: string;

  constructor(partial: Partial<UnsubscribeDTO>) {
    Object.assign(this, partial);
  }
}

export class UnsubscribeResponseDTO {
  message: string;

  constructor(partial: Partial<UnsubscribeResponseDTO>) {
    Object.assign(this, partial);
  }
}

/** The question the send paths actually ask: may I reach this user, this way? */
export class NotificationDeliveryCheckDTO {
  userId: string;
  category: ENotificationCategory;
  channel: ENotificationChannel;

  constructor(partial: Partial<NotificationDeliveryCheckDTO>) {
    Object.assign(this, partial);
  }
}
