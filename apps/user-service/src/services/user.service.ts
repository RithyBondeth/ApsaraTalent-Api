import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  UserResponseDTO,
  FavoriteCountResponseDTO,
  UserIdDTO,
  UpdatePushNotificationTokenDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  CompanyRecommendationsDTO,
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IUserService } from '@app/contracts/interfaces/service/user-service.interface';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

@Injectable()
export class UserService implements IUserService, OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmpRepository: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmpRepository: Repository<CompanyFavoriteEmployee>,
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepository: Repository<JobMatching>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
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
        `Cache warming failed (non-fatal): ${(error as Error).message}`,
      );
    }
  }

  async findAllUsers(dto: PaginationDTO): Promise<UserResponseDTO[]> {
    const { skip = 0, limit = 20 } = dto;
    const cacheKey = this.redisService.generateListKey('user', { skip, limit });
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All users cache HIT');
      return cached;
    }

    this.logger.info('All users cache MISS');

    try {
      // Use QueryBuilder: paginated, excludes sensitive fields, lighter relations for list
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
        .skip(skip)
        .take(limit)
        .getMany();

      if (!users || users.length === 0)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no users available',
        });

      const result = users.map(
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

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while finding all the users.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
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
        (error as Error).message ||
          'An error occurred while counting all users.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while counting all users.',
      });
    }
  }

  async findOneUserByID(dto: UserIdDTO): Promise<UserResponseDTO> {
    const { userId } = dto;
    const cacheKey = this.redisService.generateUserKey('detail', userId);
    const cached = await this.redisService.get<UserResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`User ${userId} cache HIT`);
      return cached;
    }

    this.logger.info(`User ${userId} cache MISS`);

    try {
      // Use QueryBuilder to exclude sensitive fields (password, tokens, OTP, etc.)
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
        (error as Error).message ||
          'An error occurred while finding user by id.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while finding user by id.',
      });
    }
  }

  async updatePushNotificationToken(
    dto: UpdatePushNotificationTokenDTO,
  ): Promise<CoreResponseDTO> {
    const { userId, token } = dto;
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

      return new CoreResponseDTO({
        message: 'Push notification token updated successfully',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update push token: ${errorMessage}`);
      throw new RpcException({
        statusCode: 500,
        message: errorMessage || 'An error occurred while updating push token.',
      });
    }
  }

  async employeeFavoriteCompany(
    dto: EmployeeCompanyFavoriteDTO,
  ): Promise<CoreResponseDTO> {
    const { eid, cid } = dto;
    try {
      const exists = await this.empFavoriteCmpRepository.findOne({
        where: {
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (exists)
        throw new RpcException({
          statusCode: 400,
          message: 'Already favorited',
        });

      const favorite = this.empFavoriteCmpRepository.create({
        employee: { id: eid },
        company: { id: cid },
      });

      await this.empFavoriteCmpRepository.save(favorite);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(cid),
        ),
      ]);

      // ✅ Emit events for other services if needed
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} favorited company ${cid}`);

      return new CoreResponseDTO({
        message: 'Successfully added company to favorites',
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while favoriting company.',
      );
      if ((error as any)?.code === '23505') {
        throw new RpcException({
          statusCode: 400,
          message: 'Already favorited',
        });
      }
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while favoriting company.',
      });
    }
  }

  async employeeUnfavoriteCompany(
    dto: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO> {
    const { eid, cid, favoriteId } = dto;
    try {
      const favoriteToRemove = await this.empFavoriteCmpRepository.findOne({
        where: {
          id: favoriteId,
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (!favoriteToRemove)
        throw new RpcException({
          message:
            "Favorite not found or you don't have permission to remove it.",
          statusCode: 404,
        });

      await this.empFavoriteCmpRepository.remove(favoriteToRemove);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(cid),
        ),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} unfavorited company ${cid}`);

      return new CoreResponseDTO({
        message: 'Successfully removed company from favorites',
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while unfavoriting company.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while unfavoriting company.',
      });
    }
  }

  async companyFavoriteEmployee(
    dto: CompanyEmployeeFavoriteDTO,
  ): Promise<CoreResponseDTO> {
    const { cid, eid } = dto;
    try {
      const exists = await this.cmpFavoriteEmpRepository.findOne({
        where: {
          employee: { id: eid },
          company: { id: cid },
        },
      });

      if (exists)
        throw new RpcException({
          statusCode: 400,
          message: 'Already favorited',
        });

      const favorite = this.cmpFavoriteEmpRepository.create({
        employee: { id: eid },
        company: { id: cid },
      });

      await this.cmpFavoriteEmpRepository.save(favorite);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(eid),
        ),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} favorited employee ${eid}`);

      return new CoreResponseDTO({
        message: 'Successfully added employee to favorites',
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while favoriting employee.',
      );
      if ((error as any)?.code === '23505') {
        throw new RpcException({
          statusCode: 400,
          message: 'Already favorited',
        });
      }
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while favoriting employee.',
      });
    }
  }

  async companyUnfavoriteEmployee(
    dto: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO> {
    const { cid, eid, favoriteId } = dto;
    try {
      const favoriteToRemove = await this.cmpFavoriteEmpRepository.findOne({
        where: {
          id: favoriteId,
          company: { id: cid },
          employee: { id: eid },
        },
      });

      if (!favoriteToRemove)
        throw new RpcException({
          message:
            "Favorite not found or you don't have permission to remove it.",
          statusCode: 404,
        });

      await this.cmpFavoriteEmpRepository.remove(favoriteToRemove);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(cid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(eid),
        ),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} unfavorited employee ${eid}`);

      return new CoreResponseDTO({
        message: 'Successfully removed employee from favorites',
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while unfavoriting employee.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while unfavoriting employee.',
      });
    }
  }

  async findAllEmployeeFavorites(
    dto: EmployeeFavoriteLookupDTO,
  ): Promise<CompanyResponseDTO[]> {
    const { eid } = dto;
    // ✅ Use helper method
    const cacheKey = this.redisService.generateEmployeeFavoritesKey(eid);
    const cached = await this.redisService.get<CompanyResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info(`All employee ${eid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All employee ${eid} favorites cache MISS`);

    try {
      // Single query with JOIN — no N+1 loop for userId
      const allFavorites = await this.empFavoriteCmpRepository.find({
        where: { employee: { id: eid } },
        relations: ['company', 'company.openPositions', 'company.user'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result: any[] = [];
        await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);
        return result;
      }

      // userId is now available via the JOIN — no extra queries
      const result = allFavorites.map(
        (favorite) =>
          new CompanyResponseDTO({
            ...favorite.company,
            openPositions: favorite.company?.openPositions?.map(
              (job) => new JobPositionResponseDTO(job),
            ),
          }),
      );

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while finding employee favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while finding employee favorites.',
      });
    }
  }

  async findAllCompanyFavorites(
    dto: CompanyFavoriteLookupDTO,
  ): Promise<EmployeeResponseDTO[]> {
    const { cid } = dto;
    // ✅ Use helper method
    const cacheKey = this.redisService.generateCompanyFavoritesKey(cid);
    const cached = await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info(`All company ${cid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All company ${cid} favorites cache MISS`);

    try {
      // Single query with JOIN — no N+1 loop for userId
      const allFavorites = await this.cmpFavoriteEmpRepository.find({
        where: { company: { id: cid } },
        relations: ['employee', 'employee.skills', 'employee.user'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result: any[] = [];
        await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);
        return result;
      }

      // userId is now available via the JOIN — no extra queries
      const result = allFavorites.map(
        (favorite) => new EmployeeResponseDTO(favorite.employee),
      );

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while finding company favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while finding company favorites.',
      });
    }
  }

  async countCompanyFavorite(
    dto: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { cid } = dto;
    // ✅ Use helper method
    const cacheKey = this.redisService.generateCompanyFavoriteCountKey(cid);
    const cached =
      await this.redisService.get<FavoriteCountResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`Company ${cid} favorite count cache HIT`);
      return cached;
    }

    this.logger.info(`Company ${cid} favorite count cache MISS`);

    try {
      const countAllCompanyFavorites =
        await this.cmpFavoriteEmpRepository.count({
          where: { company: { id: cid } },
        });

      const result = { count: countAllCompanyFavorites };

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return new FavoriteCountResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting company favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while counting company favorites.',
      });
    }
  }

  async countEmployeeFavorite(
    dto: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { eid } = dto;
    // ✅ Use helper method
    const cacheKey = this.redisService.generateEmployeeFavoriteCountKey(eid);
    const cached =
      await this.redisService.get<FavoriteCountResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${eid} favorite count cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${eid} favorite count cache MISS`);

    try {
      const countAllEmployeeFavorites =
        await this.empFavoriteCmpRepository.count({
          where: { employee: { id: eid } },
        });

      const result = { count: countAllEmployeeFavorites };

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return new FavoriteCountResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting employee favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while counting employee favorites.',
      });
    }
  }

  async findAllCareerScopes(): Promise<any> {
    const cacheKey = this.redisService.generateListKey('career-scopes', {});
    const cached =
      await this.redisService.get<Partial<CareerScope[]>>(cacheKey);

    if (cached) {
      this.logger.info('All career scopes cache HIT');
      return cached;
    }

    this.logger.info('All career scopes cache MISS');

    try {
      const careerScopes = await this.careerScopeRepository.find();
      if (!careerScopes || careerScopes.length === 0)
        throw new RpcException({
          statusCode: 404,
          message: 'No career scopes available',
        });

      await this.redisService.set(cacheKey, careerScopes, CACHE_TTL.STATIC);

      return careerScopes;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while finding career scopes.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while finding career scopes.',
        statusCode: 500,
      });
    }
  }

  // Helper method to get favorite relationship (optional)
  async getEmployeeFavoriteRelationship(
    eid: string,
    cid: string,
  ): Promise<EmployeeFavoriteCompany | null> {
    return await this.empFavoriteCmpRepository.findOne({
      where: {
        employee: { id: eid },
        company: { id: cid },
      },
    });
  }

  // Helper method to get company favorite relationship (optional)
  async getCompanyFavoriteRelationship(
    cid: string,
    eid: string,
  ): Promise<CompanyFavoriteEmployee | null> {
    return await this.cmpFavoriteEmpRepository.findOne({
      where: {
        company: { id: cid },
        employee: { id: eid },
      },
    });
  }

  async clearCurrentUserCache(dto: UserIdDTO) {
    const { userId } = dto;
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

  async getEmployeeRecommendations(
    dto: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    const { employeeId, limit = 10 } = dto;
    const cacheKey = this.redisService.generateListKey(
      'employee-recommendations',
      { employeeId, limit },
    );
    const cached = await this.redisService.get<any[]>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${employeeId} recommendations cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${employeeId} recommendations cache MISS`);

    try {
      // 1. Get the employee's career scope IDs
      const employee = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.employee', 'employee')
        .leftJoinAndSelect('employee.careerScopes', 'empCareerScopes')
        .where('employee.id = :employeeId', { employeeId })
        .getOne();

      if (
        !employee?.employee?.careerScopes ||
        employee.employee.careerScopes.length === 0
      ) {
        return [];
      }

      const careerScopeIds = employee.employee.careerScopes.map((cs) => cs.id);

      // 2. Get company IDs the employee has already liked
      const likedMatches = await this.jobMatchingRepository.find({
        where: { employee: { id: employeeId }, employeeLiked: true },
        relations: ['company'],
      });
      const likedCompanyIds = likedMatches.map((m) => m.company.id);

      // 3. Query companies sharing career scopes, scored by overlap count
      const qb = this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.company', 'company')
        .innerJoin(
          'company.careerScopes',
          'cs',
          'cs.id IN (:...careerScopeIds)',
          { careerScopeIds },
        )
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .addSelect('COUNT(cs.id)', 'overlap_count')
        .groupBy('user.id')
        .addGroupBy('company.id')
        .addGroupBy('openPositions.id')
        .orderBy('overlap_count', 'DESC')
        .take(limit);

      if (likedCompanyIds.length > 0) {
        qb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
          likedCompanyIds,
        });
      }

      const results = await qb.getMany();

      const recommendations = results.map(
        (user) =>
          new CompanyResponseDTO({
            ...user.company,
            openPositions: user.company?.openPositions?.map(
              (job) => new JobPositionResponseDTO(job),
            ),
          }),
      );

      await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);

      return recommendations;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while getting employee recommendations.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while getting employee recommendations.',
      });
    }
  }

  async getCompanyRecommendations(
    dto: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    const { companyId, limit = 10 } = dto;
    const cacheKey = this.redisService.generateListKey(
      'company-recommendations',
      { companyId, limit },
    );
    const cached = await this.redisService.get<any[]>(cacheKey);

    if (cached) {
      this.logger.info(`Company ${companyId} recommendations cache HIT`);
      return cached;
    }

    this.logger.info(`Company ${companyId} recommendations cache MISS`);

    try {
      // 1. Get the company's career scope IDs
      const company = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'cmpCareerScopes')
        .where('company.id = :companyId', { companyId })
        .getOne();

      if (
        !company?.company?.careerScopes ||
        company.company.careerScopes.length === 0
      ) {
        return [];
      }

      const careerScopeIds = company.company.careerScopes.map((cs) => cs.id);

      // 2. Get employee IDs the company has already liked
      const likedMatches = await this.jobMatchingRepository.find({
        where: { company: { id: companyId }, companyLiked: true },
        relations: ['employee'],
      });
      const likedEmployeeIds = likedMatches.map((m) => m.employee.id);

      // 3. Query employees sharing career scopes, scored by overlap count
      const qb = this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.employee', 'employee')
        .innerJoin(
          'employee.careerScopes',
          'cs',
          'cs.id IN (:...careerScopeIds)',
          { careerScopeIds },
        )
        .leftJoinAndSelect('employee.skills', 'skills')
        .addSelect('COUNT(cs.id)', 'overlap_count')
        .groupBy('user.id')
        .addGroupBy('employee.id')
        .addGroupBy('skills.id')
        .orderBy('overlap_count', 'DESC')
        .take(limit);

      if (likedEmployeeIds.length > 0) {
        qb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
          likedEmployeeIds,
        });
      }

      const results = await qb.getMany();

      const recommendations = results.map(
        (user) => new EmployeeResponseDTO(user.employee),
      );

      await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);

      return recommendations;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while getting company recommendations.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error).message ||
          'An error occurred while getting company recommendations.',
      });
    }
  }
}
