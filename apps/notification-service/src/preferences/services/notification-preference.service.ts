import { randomBytes } from 'node:crypto';
import { NotificationPreference } from '@app/common/database/entities/notification-preference.entity';
import { ENotificationCategory } from '@app/common/database/enums/notification-category.enum';
import { ENotificationChannel } from '@app/common/database/enums/notification-channel.enum';
import { DEFAULT_CHANNEL_PREFERENCES } from '@app/common/utils/notification-category.util';
import {
  NotificationDeliveryCheckDTO,
  NotificationPreferenceResponseDTO,
  NotificationPreferenceUserDTO,
  TResolvedCategoryPreferences,
  UnsubscribeDTO,
  UnsubscribeResponseDTO,
  UpdateNotificationPreferenceDTO,
} from '@app/contracts/dtos/notification';
import { Injectable } from '@nestjs/common';
import { AnalyticsService, EAnalyticsEvent } from '@app/common/analytics';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

const UNSUBSCRIBE_TOKEN_BYTES = 24;

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepo: Repository<NotificationPreference>,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationPreferenceService.name);
  }

  /**
   * A user's preferences with every default already merged in.
   *
   * Callers never see whether a row exists — that is an implementation detail
   * of writing the table lazily, and a UI that had to care would render
   * differently for a user who has never opened the setting.
   */
  async resolve(
    { userId }: NotificationPreferenceUserDTO,
    stored?: NotificationPreference | null,
  ): Promise<NotificationPreferenceResponseDTO> {
    const row =
      stored ??
      (await this.preferenceRepo.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      }));

    const categories = Object.values(ENotificationCategory).reduce(
      (resolved, category) => {
        const defaults = DEFAULT_CHANNEL_PREFERENCES[category];
        const chosen = row?.categories?.[category] ?? {};
        resolved[category] = {
          [ENotificationChannel.EMAIL]:
            chosen[ENotificationChannel.EMAIL] ??
            defaults[ENotificationChannel.EMAIL],
          [ENotificationChannel.PUSH]:
            chosen[ENotificationChannel.PUSH] ??
            defaults[ENotificationChannel.PUSH],
        };
        return resolved;
      },
      {} as TResolvedCategoryPreferences,
    );

    return new NotificationPreferenceResponseDTO({
      emailEnabled: row?.emailEnabled ?? true,
      pushEnabled: row?.pushEnabled ?? true,
      categories,
    });
  }

  /**
   * The question every send path asks before reaching for a user.
   *
   * ACCOUNT is answered `true` without consulting anything. Those messages are
   * transactional — verification codes, password resets, a suspension notice —
   * and a user who could switch them off would have locked themselves out with
   * a checkbox. The master switch does not reach them either.
   */
  async canDeliver({
    userId,
    category,
    channel,
  }: NotificationDeliveryCheckDTO): Promise<boolean> {
    if (category === ENotificationCategory.ACCOUNT) return true;

    try {
      const preferences = await this.resolve({ userId });

      const masterEnabled =
        channel === ENotificationChannel.EMAIL
          ? preferences.emailEnabled
          : preferences.pushEnabled;
      if (!masterEnabled) return false;

      return preferences.categories[category][channel];
    } catch (error) {
      // Failing open is the deliberate choice: a database blip should not
      // silently swallow the notification telling someone they were hired.
      // Over-delivery is recoverable; a dropped hiring update is not.
      this.logger.warn(
        `Preference lookup failed for userId=${userId}, delivering anyway: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return true;
    }
  }

  /**
   * Apply a partial update, creating the row on first write.
   *
   * `categories` merges per category rather than replacing the map, so sending
   * one toggle cannot clobber a choice another tab made a second earlier.
   */
  async update(
    dto: UpdateNotificationPreferenceDTO,
  ): Promise<NotificationPreferenceResponseDTO> {
    try {
      const row = await this.findOrCreate(dto.userId);

      if (dto.emailEnabled !== undefined) row.emailEnabled = dto.emailEnabled;
      if (dto.pushEnabled !== undefined) row.pushEnabled = dto.pushEnabled;

      if (dto.categories) {
        const merged = { ...(row.categories ?? {}) };
        for (const [category, channels] of Object.entries(dto.categories)) {
          // Unknown keys are dropped rather than stored. The enums are the
          // contract; anything else is a client sending the wrong shape, and
          // persisting it would make the column impossible to reason about.
          if (
            !Object.values(ENotificationCategory).includes(
              category as ENotificationCategory,
            )
          ) {
            continue;
          }
          merged[category as ENotificationCategory] = {
            ...(merged[category as ENotificationCategory] ?? {}),
            ...this.pickKnownChannels(channels),
          };
        }
        row.categories = merged;
      }

      const saved = await this.preferenceRepo.save(row);

      this.analyticsService.capture(
        dto.userId,
        EAnalyticsEvent.NOTIFICATION_PREFERENCE_CHANGED,
        {
          email_master_off: dto.emailEnabled === false,
          push_master_off: dto.pushEnabled === false,
          categories_changed: Object.keys(dto.categories ?? {}),
        },
      );

      return this.resolve({ userId: dto.userId }, saved);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        `Failed to update notification preferences for userId=${dto.userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new RpcException({
        message: 'Failed to update notification preferences',
        statusCode: 500,
      });
    }
  }

  /**
   * Honour a one-click unsubscribe link.
   *
   * It only ever turns email *off*. A token that could also turn it back on
   * would let anyone holding a forwarded email re-subscribe the recipient, and
   * the link travels in plain text through mail servers nobody here controls.
   *
   * An unknown token reports success. Confirming which tokens are real would
   * turn the endpoint into an oracle, and the user-visible outcome — "you will
   * not get these emails" — is true either way.
   */
  async unsubscribe({
    token,
  }: UnsubscribeDTO): Promise<UnsubscribeResponseDTO> {
    const acknowledgement = new UnsubscribeResponseDTO({
      message: 'You have been unsubscribed from notification emails.',
    });

    try {
      const row = await this.preferenceRepo.findOne({
        where: { unsubscribeToken: token },
      });
      if (!row) {
        this.logger.warn('Unsubscribe attempted with an unknown token');
        return acknowledgement;
      }

      row.emailEnabled = false;
      await this.preferenceRepo.save(row);

      this.analyticsService.capture(
        row.user?.id ?? 'unknown',
        EAnalyticsEvent.UNSUBSCRIBED_VIA_EMAIL_LINK,
        {},
      );

      return acknowledgement;
    } catch (error) {
      this.logger.error(
        `Unsubscribe failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw new RpcException({
        message: 'Failed to process the unsubscribe request',
        statusCode: 500,
      });
    }
  }

  /** The token an email footer links to. Mints the row if it does not exist. */
  async unsubscribeTokenFor(userId: string): Promise<string> {
    const row = await this.findOrCreate(userId);
    return row.unsubscribeToken;
  }

  private async findOrCreate(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferenceRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (existing) return existing;

    return this.preferenceRepo.save(
      this.preferenceRepo.create({
        user: { id: userId } as never,
        emailEnabled: true,
        pushEnabled: true,
        categories: {},
        unsubscribeToken: randomBytes(UNSUBSCRIBE_TOKEN_BYTES).toString('hex'),
      }),
    );
  }

  private pickKnownChannels(
    channels: Partial<Record<ENotificationChannel, boolean>> | undefined,
  ): Partial<Record<ENotificationChannel, boolean>> {
    const known: Partial<Record<ENotificationChannel, boolean>> = {};
    for (const channel of Object.values(ENotificationChannel)) {
      const value = channels?.[channel];
      if (typeof value === 'boolean') known[channel] = value;
    }
    return known;
  }
}
