import { CareerScope } from '@app/common/database/entities/career-scope.entity';

import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  UserResponseDTO,
  UserIdDTO,
  UpdatePushNotificationTokenDTO,
  UpdatePushNotificationTokenResponseDTO,
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
  CareerScopesResponseDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IUserService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

/**
 * Core user reads and cache lifecycle. Favourites and recommendations now live
 * in FavoritesService and RecommendationsService respectively.
 */
@Injectable()
export class UserService implements IUserService, OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  // Cache warming — pre-load frequently accessed data on startup
  async onModuleInit() {
    try {
      this.logger.info(
        'Cache warming: loading career scopes and first page of users...',
      );
      await Promise.all([
        this.findAllCareerScopes(),
        this.findAllUsers({ skip: 0, limit: 20 }),
      ]);
      this.logger.info('Cache warming complete');
    } catch (error) {
      this.logger.warn(
        `Cache warming failed (non-fatal): ${(error as Error)?.message || 'Unknown error'}`,
      );
    }
  }

  async findAllUsers(paginationDTO: PaginationDTO): Promise<UserResponseDTO[]> {
    const { skip = 0, limit = 20 } = paginationDTO;
    const cacheKey = this.redisService.generateListKey('user', { skip, limit });
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All users cache HIT');
      return cached;
    }

    this.logger.info('All users cache MISS');

    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.role',
          'user.email',
          'user.phone',
          'user.profileCompleted',
          'user.isEmailVerified',
          'user.lastLoginAt',
          'user.lastLoginMethod',
          'user.createdAt',
        ])
        // Employee — only load essential fields for list view
        .leftJoinAndSelect('user.employee', 'employee')
        .leftJoinAndSelect('employee.skills', 'skills')
        .leftJoinAndSelect('employee.careerScopes', 'empCareerScopes')
        // Company — only load essential fields for list view
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .leftJoinAndSelect('company.careerScopes', 'cmpCareerScopes')
        .orderBy('user.createdAt', 'DESC')
        .addOrderBy('user.id', 'ASC')
        .skip(skip)
        .take(limit)
        .getMany();

      if (!users || users.length === 0)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no users available',
        });

      const results = users.map(
        (user) =>
          new UserResponseDTO({
            ...user,
            employee: user.employee
              ? new EmployeeResponseDTO(user.employee)
              : undefined,
            company: new CompanyResponseDTO({
              ...user.company,
              openPositions: user.company?.openPositions?.map(
                (job) => new JobPositionResponseDTO(job),
              ),
            }),
          }),
      );

      await this.redisService.set(cacheKey, results, CACHE_TTL.MEDIUM);

      return results;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while finding all the users.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while finding all the users.',
      });
    }
  }

  async countAllUsers(): Promise<CountAllUsersResponseDTO> {
    const cacheKey = 'apsaratalent:user-service:user:count:all';
    const cached =
      await this.redisService.get<CountAllUsersResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info('All users count cache HIT');
      return cached;
    }

    this.logger.info('All users count cache MISS');

    try {
      const totalUsers = await this.userRepository.count();
      const result = { totalUsers };

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return new CountAllUsersResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while counting all users.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while counting all users.',
      });
    }
  }

  async findOneUserByID(userIdDTO: UserIdDTO): Promise<UserResponseDTO> {
    const { userId } = userIdDTO;
    const cacheKey = this.redisService.generateUserKey('detail', userId);
    const cached = await this.redisService.get<UserResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`User ${userId} cache HIT`);
      return cached;
    }

    this.logger.info(`User ${userId} cache MISS`);

    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.role',
          'user.email',
          'user.phone',
          'user.profileCompleted',
          'user.isEmailVerified',
          'user.lastLoginAt',
          'user.lastLoginMethod',
          'user.createdAt',
        ])
        .leftJoinAndSelect('user.employee', 'employee')
        .leftJoinAndSelect('employee.skills', 'skills')
        .leftJoinAndSelect('employee.experiences', 'experiences')
        .leftJoinAndSelect('employee.educations', 'educations')
        .leftJoinAndSelect('employee.careerScopes', 'empCareerScopes')
        .leftJoinAndSelect('employee.socials', 'empSocials')
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .leftJoinAndSelect('company.careerScopes', 'cmpCareerScopes')
        .leftJoinAndSelect('company.benefits', 'benefits')
        .leftJoinAndSelect('company.values', 'companyValues')
        .leftJoinAndSelect('company.socials', 'cmpSocials')
        .leftJoinAndSelect('company.images', 'images')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'There is no user with this id',
        });

      const result: UserResponseDTO = new UserResponseDTO({
        ...user,
        employee: user.employee
          ? new EmployeeResponseDTO(user.employee)
          : undefined,
        company: new CompanyResponseDTO({
          ...user.company,
          openPositions: user.company?.openPositions?.map(
            (job) => new JobPositionResponseDTO(job),
          ),
        }),
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while finding user by id.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while finding user by id.',
      });
    }
  }

  async updatePushNotificationToken(
    updatePushNotificationTokenDTO: UpdatePushNotificationTokenDTO,
  ): Promise<UpdatePushNotificationTokenResponseDTO> {
    const { userId, token } = updatePushNotificationTokenDTO;
    const normalizedToken =
      typeof token === 'string' && token.trim().length > 0
        ? token.trim()
        : null;

    try {
      const result = await this.userRepository.update(
        { id: userId },
        { pushNotificationToken: normalizedToken },
      );

      if (!result.affected) {
        throw new RpcException({
          statusCode: 404,
          message: 'There is no user with this id',
        });
      }

      await this.redisService.clearUserDetailCache(userId);

      return new UpdatePushNotificationTokenResponseDTO({
        message: 'Push notification token updated successfully',
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update push token: ${errorMessage}`);
      throw new RpcException({
        statusCode: 500,
        message: errorMessage || 'An error occurred while updating push token.',
      });
    }
  }

  async findAllCareerScopes(): Promise<CareerScopesResponseDTO[]> {
    const cacheKey = this.redisService.generateListKey('career-scopes', {});
    const cached =
      await this.redisService.get<Partial<CareerScope[]>>(cacheKey);

    if (cached) {
      this.logger.info('All career scopes cache HIT');
      return cached.map((cs) => new CareerScopesResponseDTO(cs));
    }

    this.logger.info('All career scopes cache MISS');

    try {
      const careerScopes = await this.careerScopeRepository.find();
      if (!careerScopes || careerScopes.length === 0)
        throw new RpcException({
          statusCode: 404,
          message: 'No career scopes available',
        });

      const result = careerScopes.map((cs) => new CareerScopesResponseDTO(cs));

      await this.redisService.set(cacheKey, result, CACHE_TTL.STATIC);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while finding career scopes.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while finding career scopes.',
        statusCode: 500,
      });
    }
  }

  async clearCurrentUserCache(userIdDTO: UserIdDTO): Promise<void> {
    const { userId } = userIdDTO;
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
  }
}
