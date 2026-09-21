import { ProfileSearchAppearance } from '@app/common/database/entities/profile-search-appearance.entity';
import { ProfileView } from '@app/common/database/entities/profile-view.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import {
  IProfileAnalyticsService,
  ProfileAnalyticsResponseDTO,
  RecentViewerDTO,
  UpdatePrivacyDTO,
  UpdatePrivacyResponseDTO,
} from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { MoreThan, Repository } from 'typeorm';

/** How many recent unique viewers the summary carries. */
const RECENT_VIEWER_LIMIT = 20;

/**
 * Writes and reads for the "who viewed your profile" + search-appearance
 * analytics. Deliberately fire-and-forget on the write side: an analytics
 * miss must not cost the caller their profile page or their search results.
 */
@Injectable()
export class ProfileAnalyticsService implements IProfileAnalyticsService {
  constructor(
    @InjectRepository(ProfileView)
    private readonly profileViewRepo: Repository<ProfileView>,
    @InjectRepository(ProfileSearchAppearance)
    private readonly searchAppearanceRepo: Repository<ProfileSearchAppearance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProfileAnalyticsService.name);
  }

  async recordProfileView(
    viewerUserId: string | null,
    viewedUserId: string,
  ): Promise<void> {
    // Ignore self-views (opening one's own profile) so the count is a signal
    // about interest from others, not a signal about the owner refreshing
    // their own page.
    if (viewerUserId && viewerUserId === viewedUserId) return;
    if (!viewedUserId) return;

    try {
      let viewerHidden = false;
      if (viewerUserId) {
        const viewer = await this.userRepo.findOne({
          where: { id: viewerUserId },
          select: { id: true, browsePrivately: true },
        });
        // If the viewer no longer exists (deleted mid-request), the row still
        // records a "signed-out" view against the target — which is what we
        // would have written anyway if they had never been signed in.
        viewerHidden = viewer?.browsePrivately ?? false;
      }

      await this.profileViewRepo.save(
        this.profileViewRepo.create({
          viewer: viewerUserId ? ({ id: viewerUserId } as User) : null,
          viewed: { id: viewedUserId } as User,
          viewerHidden,
        }),
      );
    } catch (error) {
      this.logger.warn(
        (error as Error).message || 'Failed to record profile view',
      );
    }
  }

  async recordSearchAppearances(userIds: string[]): Promise<void> {
    if (!userIds.length) return;

    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!uniqueIds.length) return;

    // One idempotent upsert per user per day. The whole point of the daily
    // bucket is that a page render bumps the counter; a TypeORM
    // `orUpdate(['count'])` would overwrite `count` to the incoming 1 rather
    // than adding to what is there, so this stays as raw SQL where
    // `EXCLUDED.count + <table>.count` reads directly. Using UTC for the
    // day key so a server-time change never re-partitions historical counts.
    const today = new Date().toISOString().slice(0, 10);
    const placeholders = uniqueIds
      .map((_, index) => `($${index + 1}, $${uniqueIds.length + 1}, 1, now())`)
      .join(', ');
    try {
      await this.searchAppearanceRepo.query(
        `INSERT INTO "profile_search_appearance" ("userId", "date", "count", "updatedAt")
         VALUES ${placeholders}
         ON CONFLICT ("userId", "date")
         DO UPDATE SET "count" = "profile_search_appearance"."count" + EXCLUDED."count",
                       "updatedAt" = now()`,
        [...uniqueIds, today],
      );
    } catch (error) {
      this.logger.warn(
        (error as Error).message || 'Failed to record search appearances',
      );
    }
  }

  async getMyProfileAnalytics(
    userId: string,
  ): Promise<ProfileAnalyticsResponseDTO> {
    if (!userId) {
      throw new RpcException({ statusCode: 400, message: 'User id required' });
    }

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: { id: true, browsePrivately: true },
      });
      if (!user) {
        throw new RpcException({ statusCode: 404, message: 'User not found' });
      }

      const now = Date.now();
      const week = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const month = new Date(now - 30 * 24 * 60 * 60 * 1000);

      // Two count() queries rather than pulling every row: the profile could
      // have thousands of views and the summary only needs the number.
      const [profileViews7d, profileViews30d] = await Promise.all([
        this.profileViewRepo.count({
          where: { viewed: { id: userId }, viewedAt: MoreThan(week) },
        }),
        this.profileViewRepo.count({
          where: { viewed: { id: userId }, viewedAt: MoreThan(month) },
        }),
      ]);

      // Sum of the last 30 day-buckets. `sum` returns a string in pg's node
      // driver; coerce to a number and default to zero.
      const monthDate = month.toISOString().slice(0, 10);
      const sumRow = await this.searchAppearanceRepo
        .createQueryBuilder('sa')
        .select('COALESCE(SUM(sa.count), 0)', 'total')
        .where('sa."userId" = :userId', { userId })
        .andWhere('sa.date >= :from', { from: monthDate })
        .getRawOne<{ total: string }>();
      const searchAppearances30d = Number(sumRow?.total ?? 0);

      // Most recent viewers, capped. `viewer` is loaded through the relation
      // so the DTO can carry the display bits; the `viewerHidden` flag hides
      // the identity but the row still tells the recipient someone was there.
      const recentRows = await this.profileViewRepo.find({
        where: { viewed: { id: userId } },
        relations: ['viewer', 'viewer.employee', 'viewer.company'],
        order: { viewedAt: 'DESC' },
        take: RECENT_VIEWER_LIMIT,
      });

      const recentViewers = recentRows.map((row) => this.toRecentViewer(row));

      return new ProfileAnalyticsResponseDTO({
        profileViews7d,
        profileViews30d,
        searchAppearances30d,
        recentViewers,
        browsePrivately: user.browsePrivately,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Failed to load profile analytics',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  private toRecentViewer(row: ProfileView): RecentViewerDTO {
    // A signed-out visitor and a hidden viewer both surface as unnamed rows —
    // the timestamp is the useful bit, the number moved because of them.
    if (!row.viewer || row.viewerHidden) {
      return new RecentViewerDTO({
        viewerId: null,
        viewerName: null,
        viewerAvatar: null,
        viewerRole: null,
        viewedAt: row.viewedAt,
      });
    }

    const employee = row.viewer.employee;
    const company = row.viewer.company;
    const isEmployee = row.viewer.role === EUserRole.EMPLOYEE;
    return new RecentViewerDTO({
      viewerId: row.viewer.id,
      viewerName: isEmployee
        ? employee?.firstname && employee?.lastname
          ? `${employee.firstname} ${employee.lastname}`
          : (employee?.username ?? null)
        : (company?.name ?? null),
      viewerAvatar: isEmployee
        ? (employee?.avatar ?? null)
        : (company?.avatar ?? null),
      viewerRole: row.viewer.role,
      viewedAt: row.viewedAt,
    });
  }

  async updatePrivacySettings(
    userId: string,
    dto: UpdatePrivacyDTO,
  ): Promise<UpdatePrivacyResponseDTO> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: { id: true, browsePrivately: true },
      });
      if (!user) {
        throw new RpcException({ statusCode: 404, message: 'User not found' });
      }
      user.browsePrivately = dto.browsePrivately;
      await this.userRepo.save(user);
      return new UpdatePrivacyResponseDTO({
        browsePrivately: user.browsePrivately,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Failed to update privacy');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
