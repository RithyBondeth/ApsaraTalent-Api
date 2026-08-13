import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { RedisService } from './redis.service';
import {
  generateAuthSessionKey,
  generateCompanyKey,
  generateEmployeeKey,
  generateUserKey,
} from '@app/common/redis/redis-keys.util';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async invalidateEmployeeCache(employeeId: string): Promise<void> {
    const users = await this.userRepository.find({
      where: { employee: { id: employeeId } },
      select: ['id'],
    });

    const keysToDelete: string[] = [
      generateEmployeeKey('detail', employeeId),
      ...users.flatMap((user) => [
        generateUserKey('detail', user.id),
        generateAuthSessionKey(user.id),
      ]),
    ];

    await Promise.all([
      ...keysToDelete.map((key) => this.redisService.del(key)),
      this.redisService.delPattern('employee:list:*'),
      this.redisService.delPattern('employee:search:*'),
      this.redisService.delPattern('user:list:*'),
      this.redisService.delPattern('employee-recommendations:list:*'),
      this.redisService.delPattern('company-recommendations:list:*'),
      this.redisService.invalidateMatchingProfileCaches(),
    ]);

    this.logger.log(
      { employeeId, keysToDelete },
      'Employee caches invalidated',
    );
  }

  async invalidateCompanyCache(companyId: string): Promise<void> {
    const users = await this.userRepository.find({
      where: { company: { id: companyId } },
      select: ['id'],
    });

    const keysToDelete: string[] = [
      generateCompanyKey('detail', companyId),
      ...users.flatMap((user) => [
        generateUserKey('detail', user.id),
        generateAuthSessionKey(user.id),
      ]),
    ];

    await Promise.all([
      ...keysToDelete.map((key) => this.redisService.del(key)),
      this.redisService.delPattern('company:list:*'),
      this.redisService.delPattern('user:list:*'),
      this.redisService.delPattern('employee-recommendations:list:*'),
      this.redisService.delPattern('company-recommendations:list:*'),
      this.redisService.invalidateJobSearchCaches(),
      this.redisService.invalidateMatchingProfileCaches(),
    ]);

    this.logger.log({ companyId, keysToDelete }, 'Company caches invalidated');
  }

  // ==================== USER EVENTS ====================
  @OnEvent('user.updated')
  async handleUserUpdate(payload: { userId: string }): Promise<void> {
    const { userId } = payload;
    await Promise.all([
      this.redisService.del(generateUserKey('detail', userId)),
      this.redisService.del(generateUserKey('profile', userId)),
      this.redisService.del(generateUserKey('settings', userId)),
    ]);
    this.logger.log(`Invalidated cache for user: ${userId}`);
  }

  // ==================== EMPLOYEE EVENTS ====================
  @OnEvent('employee.updated')
  async handleEmployeeUpdate(payload: { employeeId: string }): Promise<void> {
    const { employeeId } = payload;
    await Promise.all([
      this.redisService.del(generateEmployeeKey('detail', employeeId)),
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
      this.redisService.del(generateEmployeeKey('favorites', employeeId)),
      this.redisService.del(generateEmployeeKey('favorite-count', employeeId)),
    ]);
    this.logger.log(`Invalidated favorites cache for employee: ${employeeId}`);
  }

  // ==================== COMPANY EVENTS ====================
  @OnEvent('company.updated')
  async handleCompanyUpdate(payload: { companyId: string }): Promise<void> {
    const { companyId } = payload;
    await this.invalidateCompanyCache(companyId);
  }

  @OnEvent('company.favorites.updated')
  async handleCompanyFavoritesUpdate(payload: {
    companyId: string;
  }): Promise<void> {
    const { companyId } = payload;
    await Promise.all([
      this.redisService.del(generateCompanyKey('favorites', companyId)),
      this.redisService.del(generateCompanyKey('favorite-count', companyId)),
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
