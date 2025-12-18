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

  // Invalidation helpers
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`user:*:${userId}`),
      this.delPattern(`user:list:*`),
    ]);
  }

  async invalidateEmployee(employeeId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`employee:*:${employeeId}`),
      this.delPattern('employee:list:*'),
      this.delPattern('*:favorite:*'), // Invalidate favorite lists
    ]);
  }

  async invalidateCompany(companyId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`company:*:${companyId}`),
      this.delPattern('company:list:*'),
      this.delPattern('*:favorite:*'),
    ]);
  }

  async invalidateAllLists(): Promise<void> {
    await Promise.all([
      this.delPattern('user:list:*'),
      this.delPattern('employee:list:*'),
      this.delPattern('company:list:*'),
      this.delPattern('*:search:*'),
    ]);
  }
}
