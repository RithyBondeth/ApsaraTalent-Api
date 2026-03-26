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
    const queryString = JSON.stringify(query);
    return `${this.PREFIX}:${entity}:search:${queryString}`;
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

  async delPattern(pattern: string): Promise<void> {
    try {
      const client = (this.cacheManager.stores as any).getClient();
      if (client && typeof client.keys === 'function') {
        const keys = await client.keys(`${this.PREFIX}:${pattern}`);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: any) => this.del(key)));
          this.logger.log(`Deleted ${keys.length} keys matching ${pattern}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache DEL pattern error: ${errorMessage}`);
    }
  }

  // ⚠️ REPLACE pattern deletion with simple del calls
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

  // 🆕 NEW: Helper for list invalidation (optional)
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

  // ===== JOB SERVICE KEYS =====
  private readonly JOB_PREFIX = 'apsaratalent:job-service';

  generateJobListKey(): string {
    return `${this.JOB_PREFIX}:job:list:all`;
  }

  generateJobSearchKey(query: any): string {
    return `${this.JOB_PREFIX}:job:search:${JSON.stringify(query)}`;
  }

  generateMatchingKey(type: string, id: string): string {
    return `${this.JOB_PREFIX}:matching:${type}:${id}`;
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
    const deletions: Promise<void>[] = [this.del(this.generateTemplateListKey())];
    if (templateId) {
      deletions.push(this.del(this.generateTemplateDetailKey(templateId)));
    }
    await Promise.all(deletions);
  }
}
