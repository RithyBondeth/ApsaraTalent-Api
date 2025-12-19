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
      this.logger.error(`Cache GET error: ${error.message}`);
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache SET error: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL error: ${error.message}`);
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
      this.logger.error(`Cache DEL pattern error: ${error.message}`);
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
}
