import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { IsBoolean } from 'class-validator';

/**
 * One row on the "who viewed your profile" list. Deliberately loose types
 * so the same DTO covers a signed-in viewer, a signed-in-but-hidden viewer
 * (name/avatar suppressed), and a signed-out visitor (everything but the
 * timestamp is null). The recipient tells them apart by which fields are
 * populated, which is easier to render than a discriminated union across
 * the wire.
 */
export class RecentViewerDTO {
  /** Null when the viewer was hidden or signed out. */
  viewerId: string | null;
  /** Display name where we can name them; null on hidden / signed-out. */
  viewerName: string | null;
  /** Avatar URL, or null on hidden / signed-out. */
  viewerAvatar: string | null;
  /** 'employee' | 'company', or null on signed-out. Companies see companies
   *  showing up as viewers; that is deliberate — recruiters compare notes. */
  viewerRole: EUserRole | null;
  viewedAt: Date;

  constructor(partial: Partial<RecentViewerDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * The summary card the profile page renders. Two count windows for profile
 * views (7d and 30d) so the reader can tell a spike from a trend, one
 * 30d window for search appearances (they are noisier and a shorter window
 * over-reads the noise), and up to `recentViewers` for the drill-down.
 */
export class ProfileAnalyticsResponseDTO {
  profileViews7d: number;
  profileViews30d: number;
  searchAppearances30d: number;
  recentViewers: RecentViewerDTO[];
  /**
   * The signed-in user's own privacy state, threaded through the same read
   * so the profile page never has to make a second call to know whether to
   * show the "browsing privately" indicator beside the counts.
   */
  browsePrivately: boolean;

  constructor(partial: Partial<ProfileAnalyticsResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class UpdatePrivacyDTO {
  @IsBoolean()
  browsePrivately: boolean;
}

export class UpdatePrivacyResponseDTO {
  browsePrivately: boolean;

  constructor(partial: Partial<UpdatePrivacyResponseDTO>) {
    Object.assign(this, partial);
  }
}
