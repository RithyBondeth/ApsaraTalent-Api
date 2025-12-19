import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  // Cache TTLs (in milliseconds)
  private readonly TTLS = {
    USER_DETAIL: 300000, // 5 minutes
    EMPLOYEE_DETAIL: 300000, // 5 minutes
    COMPANY_DETAIL: 300000, // 5 minutes
    FAVORITES: 120000, // 2 minutes
    LISTS: 120000, // 2 minutes
  };

  constructor(private readonly redisService: RedisService) {}

  // ==================== USER EVENTS ====================
  @OnEvent('user.updated')
  async handleUserUpdate(payload: { userId: string }): Promise<void> {
    const { userId } = payload;
    await Promise.all([
      this.redisService.del(
        this.redisService.generateUserKey('detail', userId),
      ),
      this.redisService.del(
        this.redisService.generateUserKey('profile', userId),
      ),
      this.redisService.del(
        this.redisService.generateUserKey('settings', userId),
      ),
    ]);
    this.logger.log(`Invalidated cache for user: ${userId}`);
  }

  // ==================== EMPLOYEE EVENTS ====================
  @OnEvent('employee.updated')
  async handleEmployeeUpdate(payload: { employeeId: string }): Promise<void> {
    const { employeeId } = payload;
    await Promise.all([
      this.redisService.del(
        this.redisService.generateEmployeeKey('detail', employeeId),
      ),
      this.redisService.delPattern('employee:list:*'), // Invalidate all lists
      this.redisService.delPattern('employee:search:*'), // Invalidate searches
    ]);
    this.logger.log(`Invalidated cache for employee: ${employeeId}`);
  }

  @OnEvent('employee.favorites.updated')
  async handleEmployeeFavoritesUpdate(payload: {
    employeeId: string;
  }): Promise<void> {
    const { employeeId } = payload;
    await Promise.all([
      this.redisService.del(
        this.redisService.generateEmployeeKey('favorites', employeeId),
      ),
      this.redisService.del(
        this.redisService.generateEmployeeKey('favorite-count', employeeId),
      ),
    ]);
    this.logger.log(`Invalidated favorites cache for employee: ${employeeId}`);
  }

  // ==================== COMPANY EVENTS ====================
  @OnEvent('company.updated')
  async handleCompanyUpdate(payload: { companyId: string }): Promise<void> {
    const { companyId } = payload;
    await Promise.all([
      this.redisService.del(
        this.redisService.generateCompanyKey('detail', companyId),
      ),
      this.redisService.delPattern('company:list:*'),
    ]);
    this.logger.log(`Invalidated cache for company: ${companyId}`);
  }

  @OnEvent('company.favorites.updated')
  async handleCompanyFavoritesUpdate(payload: {
    companyId: string;
  }): Promise<void> {
    const { companyId } = payload;
    await Promise.all([
      this.redisService.del(
        this.redisService.generateCompanyKey('favorites', companyId),
      ),
      this.redisService.del(
        this.redisService.generateCompanyKey('favorite-count', companyId),
      ),
    ]);
    this.logger.log(`Invalidated favorites cache for company: ${companyId}`);
  }

  // ==================== GLOBAL EVENTS ====================
  @OnEvent('cache.clear.all')
  async handleClearAllCache(): Promise<void> {
    // WARNING: Only use in development or emergency
    this.logger.warn('Clearing ALL cache - this is a disruptive operation');
    // You would implement selective clearing here
  }

  @OnEvent('cache.lists.refresh')
  async handleRefreshLists(): Promise<void> {
    // Clear first 3 pages of each list (most accessed)
    const pages = [1, 2, 3];
    const promises = [];

    for (const page of pages) {
      promises.push(
        this.redisService.del(`employee:list:page:${page}:limit:10`),
        this.redisService.del(`company:list:page:${page}:limit:10`),
      );
    }

    await Promise.all(promises);
    this.logger.log('Refreshed list caches (pages 1-3)');
  }
}
