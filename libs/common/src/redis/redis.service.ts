import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly PREFIX = 'apsaratalent:user-service';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Cache key generators
  generateUserKey(type: string, id: string): string {
    return `${this.PREFIX}:user:${type}:${id}`;
  }

  generateEmployeeKey(type: string, id: string): string {
    return `${this.PREFIX}:employee:${type}:${id}`;
  }

  generateCompanyKey(type: string, id: string): string {
    return `${this.PREFIX}:company:${type}:${id}`;
  }

  generateListKey(entity: string, filters: any): string {
    const filterString = JSON.stringify(filters);
    return `${this.PREFIX}:${entity}:list:${filterString}`;
  }

  generateSearchKey(entity: string, query: any): string {
    const sorted = Object.fromEntries(
      Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
    );
    return `${this.PREFIX}:${entity}:search:${JSON.stringify(sorted)}`;
  }

  generateEmployeeFavoriteCountKey(employeeId: string): string {
    return this.generateEmployeeKey('favorite-count', employeeId);
  }

  generateCompanyFavoriteCountKey(companyId: string): string {
    return this.generateCompanyKey('favorite-count', companyId);
  }

  generateEmployeeFavoritesKey(employeeId: string): string {
    return this.generateEmployeeKey('favorites', employeeId);
  }

  generateCompanyFavoritesKey(companyId: string): string {
    return this.generateCompanyKey('favorites', companyId);
  }

  // Operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      return value || null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache GET error: ${errorMessage}`);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache SET error: ${errorMessage}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache DEL error: ${errorMessage}`);
    }
  }

  /**
   * Fixed-window rate counter used by the AI quota guard.
   *
   * The caller supplies a window-stamped key (e.g. ending in `:2026-06-19` or
   * a numeric window index), so re-setting the value with a constant TTL on
   * each call never extends the logical window — the key naturally rolls over
   * when the stamp changes and the TTL just garbage-collects the old key.
   *
   * Fails OPEN: if Redis is unreachable the request is allowed through, so an
   * infra blip degrades cost-protection rather than taking AI features offline.
   */
  async hitRateLimit(
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<{ allowed: boolean; count: number; limit: number }> {
    try {
      const current = (await this.cacheManager.get<number>(key)) ?? 0;
      if (current >= limit) {
        return { allowed: false, count: current, limit };
      }
      await this.cacheManager.set(key, current + 1, ttlMs);
      return { allowed: true, count: current + 1, limit };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Rate counter unavailable, allowing request: ${errorMessage}`,
      );
      return { allowed: true, count: 0, limit };
    }
  }

  // Delete keys matching a pattern
  async delPattern(
    pattern: string,
    prefix: string = this.PREFIX,
  ): Promise<void> {
    try {
      const stores = this.cacheManager.stores as any;
      const store = Array.isArray(stores) ? stores[0] : stores;
      const client =
        store?.getClient?.() ??
        store?.store?.getClient?.() ??
        (this.cacheManager as any).store?.getClient?.();
      if (client && typeof client.keys === 'function') {
        const fullPattern = `${prefix}:${pattern}`;
        const keys = await client.keys(fullPattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: any) => this.del(key)));
          this.logger.log(
            `Deleted ${keys.length} keys matching ${fullPattern}`,
          );
        }
      } else {
        await this.cacheManager.clear();
        this.logger.warn(
          'Cache store does not support pattern deletion; cleared cache safely',
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache DEL pattern error: ${errorMessage}`);
    }
  }

  // REPLACE pattern deletion with simple del calls
  async invalidateUser(userId: string): Promise<void> {
    // Instead of pattern deletion, delete specific known keys
    await Promise.all([
      this.del(this.generateUserKey('detail', userId)),
      this.del(this.generateUserKey('profile', userId)),
      this.del(this.generateUserKey('settings', userId)),
    ]);
  }

  async invalidateEmployee(employeeId: string): Promise<void> {
    await Promise.all([
      this.del(this.generateEmployeeKey('detail', employeeId)),
      this.del(this.generateEmployeeKey('favorites', employeeId)),
      this.del(this.generateEmployeeKey('favorite-count', employeeId)),
    ]);
  }

  async invalidateCompany(companyId: string): Promise<void> {
    await Promise.all([
      this.del(this.generateCompanyKey('detail', companyId)),
      this.del(this.generateCompanyKey('favorites', companyId)),
      this.del(this.generateCompanyKey('favorite-count', companyId)),
    ]);
  }

  // Helper for list invalidation (optional)
  async invalidateListPages(
    entity: string,
    pages: number[] = [1, 2, 3],
  ): Promise<void> {
    const promises = pages.map((page) =>
      this.del(`${this.PREFIX}:${entity}:list:page:${page}:limit:10`),
    );
    await Promise.all(promises);
  }

  // You can also clear profile/settings if you really use them
  async clearUserDetailCache(userId: string): Promise<void> {
    await this.del(this.generateUserKey('detail', userId));
  }

  // ===== AUTH SESSION KEYS =====
  private readonly AUTH_PREFIX = 'apsaratalent:auth';

  generateAuthSessionKey(userId: string): string {
    return `${this.AUTH_PREFIX}:session:${userId}`;
  }

  async invalidateAuthSession(userId: string): Promise<void> {
    await this.del(this.generateAuthSessionKey(userId));
  }

  // ===== JOB SERVICE KEYS =====
  private readonly JOB_PREFIX = 'apsaratalent:job-service';

  generateJobListKey(): string {
    return `${this.JOB_PREFIX}:job:list:all`;
  }

  generateJobSearchKey(query: any): string {
    const sorted = Object.fromEntries(
      Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
    );
    return `${this.JOB_PREFIX}:job:search:${JSON.stringify(sorted)}`;
  }

  generateMatchingKey(type: string, id: string): string {
    return `${this.JOB_PREFIX}:matching:${type}:${id}`;
  }

  // Invalidate cached job searches and job lists. Job keys live under
  // JOB_PREFIX, so we must pass it explicitly to delPattern.
  async invalidateJobSearchCaches(): Promise<void> {
    await Promise.all([
      this.delPattern('job:search:*', this.JOB_PREFIX),
      this.delPattern('job:list:*', this.JOB_PREFIX),
    ]);
  }

  async invalidateMatchingCaches(eid: string, cid: string): Promise<void> {
    await Promise.all([
      this.del(this.generateMatchingKey('employee-liked', eid)),
      this.del(this.generateMatchingKey('company-liked', cid)),
      this.del(this.generateMatchingKey('employee-matching', eid)),
      this.del(this.generateMatchingKey('company-matching', cid)),
      this.del(this.generateMatchingKey('employee-matching-count', eid)),
      this.del(this.generateMatchingKey('company-matching-count', cid)),
    ]);
  }

  // ===== CHAT SERVICE KEYS =====
  private readonly CHAT_PREFIX = 'apsaratalent:chat-service';

  generateRecentChatsKey(userId: string): string {
    return `${this.CHAT_PREFIX}:chat:recent:${userId}`;
  }

  generateUnreadCountKey(userId: string): string {
    return `${this.CHAT_PREFIX}:chat:unread-count:${userId}`;
  }

  async invalidateChatCaches(userId1: string, userId2?: string): Promise<void> {
    const deletions = [
      this.del(this.generateRecentChatsKey(userId1)),
      this.del(this.generateUnreadCountKey(userId1)),
    ];
    if (userId2) {
      deletions.push(
        this.del(this.generateRecentChatsKey(userId2)),
        this.del(this.generateUnreadCountKey(userId2)),
      );
    }
    await Promise.all(deletions);
  }

  // ===== RESUME SERVICE KEYS =====
  private readonly RESUME_PREFIX = 'apsaratalent:resume-service';

  generateTemplateListKey(): string {
    return `${this.RESUME_PREFIX}:templates:all`;
  }

  generateTemplateDetailKey(templateId: string): string {
    return `${this.RESUME_PREFIX}:templates:detail:${templateId}`;
  }

  generateTemplateSearchKey(query: any): string {
    return `${this.RESUME_PREFIX}:templates:search:${JSON.stringify(query)}`;
  }

  async invalidateTemplateCaches(templateId?: string): Promise<void> {
    const deletions: Promise<void>[] = [
      this.del(this.generateTemplateListKey()),
    ];
    if (templateId) {
      deletions.push(this.del(this.generateTemplateDetailKey(templateId)));
    }
    await Promise.all(deletions);
  }

  // ── Notification service ────────────────────────────────────────────
  private readonly NOTIFICATION_PREFIX = 'apsaratalent:notification-service';

  generateNotificationUnreadCountKey(userId: string): string {
    return `${this.NOTIFICATION_PREFIX}:unread-count:${userId}`;
  }

  generateNotificationListKey(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): string {
    return `${this.NOTIFICATION_PREFIX}:list:${userId}:page:${page}:limit:${limit}:unread:${unreadOnly}`;
  }

  // A user's unread count and every cached list page change together on any
  // create / mark-read / delete, so drop them all for that user at once.
  async invalidateNotificationCaches(userId: string): Promise<void> {
    await Promise.all([
      this.del(this.generateNotificationUnreadCountKey(userId)),
      this.delPattern(`list:${userId}:*`, this.NOTIFICATION_PREFIX),
    ]);
  }
}
