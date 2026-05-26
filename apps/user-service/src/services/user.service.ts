import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import {
  scopeSetSimilarityScore,
  jobTitleSimilarityScore,
  parseEmbedding,
} from '@app/common/embedding/embedding.util';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
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
  UserIdDTO,
  UpdatePushNotificationTokenDTO,
  UpdatePushNotificationTokenResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteCompanyResponseDTO,
  EmployeeUnfavoriteCompanyResponseDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  CompanyFavoriteEmployeeResponseDTO,
  CompanyUnfavoriteEmployeeResponseDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  CompanyRecommendationsDTO,
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
  CareerScopesResponseDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IUserService } from '@app/contracts/interfaces/service/user-service.interface';
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
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
  ): Promise<EmployeeFavoriteCompanyResponseDTO> {
    const { eid, cid } = employeeCompanyFavoriteDTO;
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

      // Use helper methods for consistent cache invalidation
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

      // Emit events for other services if needed
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} favorited company ${cid}`);

      return new EmployeeFavoriteCompanyResponseDTO({
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
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO> {
    const { eid, cid, favoriteId } = employeeCompanyFavoriteWithFavoriteIdDTO;
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

      // Use helper methods for consistent cache invalidation
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

      // Emit events
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} unfavorited company ${cid}`);

      return new EmployeeUnfavoriteCompanyResponseDTO({
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
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CompanyFavoriteEmployeeResponseDTO> {
    const { cid, eid } = companyEmployeeFavoriteDTO;
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

      // Use helper methods for consistent cache invalidation
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

      // Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} favorited employee ${eid}`);

      return new CompanyFavoriteEmployeeResponseDTO({
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
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO> {
    const { cid, eid, favoriteId } = companyEmployeeFavoriteWithFavoriteIdDTO;
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

      // Use helper methods for consistent cache invalidation
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

      // Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} unfavorited employee ${eid}`);

      return new CompanyUnfavoriteEmployeeResponseDTO({
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
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<EmployeeFavoritesListItemDTO[]> {
    const { eid } = employeeFavoriteLookupDTO;
    const cacheKey = this.redisService.generateEmployeeFavoritesKey(eid);
    const cached =
      await this.redisService.get<EmployeeFavoritesListItemDTO[]>(cacheKey);

    if (cached) {
      this.logger.info(`All employee ${eid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All employee ${eid} favorites cache MISS`);

    try {
      const allFavorites = await this.empFavoriteCmpRepository.find({
        where: { employee: { id: eid } },
        relations: ['company', 'company.openPositions', 'company.user'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result: EmployeeFavoritesListItemDTO[] = [];
        await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);
        return result;
      }

      const result = allFavorites.map(
        (favorite) =>
          new EmployeeFavoritesListItemDTO({
            id: favorite.id,
            createdAt: favorite.createdAt.toISOString(),
            userId: favorite.company?.user?.id ?? '',
            company: new CompanyResponseDTO({
              ...favorite.company,
              openPositions: favorite.company?.openPositions?.map(
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
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<CompanyFavoritesListItemDTO[]> {
    const { cid } = companyFavoriteLookupDTO;
    const cacheKey = this.redisService.generateCompanyFavoritesKey(cid);
    const cached =
      await this.redisService.get<CompanyFavoritesListItemDTO[]>(cacheKey);

    if (cached) {
      this.logger.info(`All company ${cid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All company ${cid} favorites cache MISS`);

    try {
      const allFavorites = await this.cmpFavoriteEmpRepository.find({
        where: { company: { id: cid } },
        relations: ['employee', 'employee.skills', 'employee.user'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result: CompanyFavoritesListItemDTO[] = [];
        await this.redisService.set(cacheKey, result, CACHE_TTL.SHORT);
        return result;
      }

      const result = allFavorites.map(
        (favorite) =>
          new CompanyFavoritesListItemDTO({
            id: favorite.id,
            createdAt: favorite.createdAt.toISOString(),
            userId: favorite.employee?.user?.id ?? '',
            employee: new EmployeeResponseDTO(favorite.employee),
          }),
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

  async countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { cid } = companyFavoriteLookupDTO;
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
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { eid } = employeeFavoriteLookupDTO;
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

  async getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    const { employeeId } = employeeRecommendationsDTO;
    const cacheKey = this.redisService.generateListKey(
      'employee-recommendations',
      { employeeId },
    );
    const cached = await this.redisService.get<any[]>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${employeeId} recommendations cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${employeeId} recommendations cache MISS`);

    try {
      // 1. Load employee with full profile data needed for scoring.
      //    `addSelect(...)` overrides select:false to load embedding vectors.
      const employeeUser = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.employee', 'employee')
        .addSelect('employee.jobEmbedding')
        .leftJoinAndSelect('employee.careerScopes', 'empCareerScopes')
        .addSelect('empCareerScopes.embedding')
        .leftJoinAndSelect('employee.skills', 'empSkills')
        .leftJoinAndSelect('employee.educations', 'empEducations')
        .where('employee.id = :employeeId', { employeeId })
        .getOne();

      const employee = employeeUser?.employee ?? null;
      const empSkillNames = (employee?.skills ?? []).map((s) =>
        s.name.toLowerCase().trim(),
      );
      const empMaxDegreeRank = Math.max(
        0,
        ...(employee?.educations ?? []).map((e) =>
          this.normalizeDegree(e.degree),
        ),
      );
      const empYears = this.extractYears(employee?.yearsOfExperience ?? '');
      const empJobTitle = (employee?.job ?? '').toLowerCase();
      const empJobEmbedding = parseEmbedding((employee as any)?.jobEmbedding);

      // 2. Get company IDs the employee has already liked
      const likedMatches = await this.jobMatchingRepository.find({
        where: { employee: { id: employeeId }, employeeLiked: true },
        relations: ['company'],
      });
      const likedCompanyIds = likedMatches.map((m) => m.company.id);

      // 3. Candidate pool: all companies with open positions.
      //    The scoring (not the pool) determines relevance — a broad pool ensures no related
      //    company is missed just because they haven't filled in career scopes or skill tags.
      //    Scoring gives 0 to unrelated companies, which the MIN_SCORE filter removes.
      const openPositionsQb = this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'userId')
        .innerJoin('user.company', 'company')
        .innerJoin('company.openPositions', 'openPositions')
        .groupBy('user.id');

      if (likedCompanyIds.length > 0) {
        openPositionsQb.andWhere('company.id NOT IN (:...likedCompanyIds)', {
          likedCompanyIds,
        });
      }

      const candidateRows = await openPositionsQb.getRawMany<{
        userId: string;
      }>();
      const userIds = candidateRows.map((r) => r.userId);
      if (userIds.length === 0) return [];

      // 4. Load full company + job data for scoring.
      //    Include embeddings on candidate career scopes (Factor 1) and
      //    job title embeddings (Factor 3 semantic match).
      const users = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'careerScopes')
        .addSelect('careerScopes.embedding')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .addSelect('openPositions.titleEmbedding')
        .leftJoinAndSelect('company.benefits', 'benefits')
        .leftJoinAndSelect('company.values', 'values')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      const empDescWords = this.extractKeywords(employee?.description ?? '');

      // 5. Multi-factor weighted scoring (max 100 pts)
      //    Factor 1: Career scope overlap       0–35  (field match — highest weight)
      //    Factor 2: Skill match ratio           0–30  (specific skill fit)
      //    Factor 3: Job title semantic match    0–20  (role relevance via pgvector)
      //    Factor 4: Description content match   0–10  (context fit)
      //    Factor 5: Location match               0–5  (minor bonus)
      //    Education/Experience: only score when BOTH sides have data (no points for empty fields)
      const scored = users.map((user) => {
        const company = user.company;
        const jobs = company.openPositions ?? [];
        let score = 0;

        // Factor 1: Career scope semantic similarity (0–35)
        // Uses pgvector cosine similarity so "Full Stack Development" ↔
        // "Backend Developer" ↔ "Software Engineer" all score correctly.
        // Falls back to exact ID overlap when embeddings are unavailable.
        score += scopeSetSimilarityScore(
          employee?.careerScopes ?? [],
          company.careerScopes ?? [],
          35,
        );

        // Factor 2: Best skill match ratio across all open positions (0–30)
        if (empSkillNames.length > 0 && jobs.length > 0) {
          let bestRatio = 0;
          for (const job of jobs) {
            const required = (job.skillsRequired ?? '')
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            if (required.length === 0) continue;
            const matched = required.filter((r) =>
              empSkillNames.includes(r),
            ).length;
            bestRatio = Math.max(bestRatio, matched / required.length);
          }
          score += bestRatio * 30;
        }

        // Factor 3: Job title semantic similarity (0–20)
        // Uses pgvector cosine similarity between employee's current job/position
        // and each company's open position title. Falls back to keyword overlap
        // when embeddings are missing (e.g. before backfill completes).
        if (empJobEmbedding) {
          score += jobTitleSimilarityScore(empJobEmbedding, jobs as any[], 20);
        } else if (empJobTitle) {
          // Keyword fallback
          const empTitleWords = empJobTitle
            .split(/\s+/)
            .filter((w) => w.length > 3);
          if (empTitleWords.length > 0 && jobs.length > 0) {
            let bestTitleScore = 0;
            for (const job of jobs) {
              const jobText =
                `${job.title ?? ''} ${job.description ?? ''}`.toLowerCase();
              const matched = empTitleWords.filter((w) =>
                jobText.includes(w),
              ).length;
              bestTitleScore = Math.max(
                bestTitleScore,
                matched / empTitleWords.length,
              );
            }
            score += bestTitleScore * 20;
          }
        }

        // Factor 4: Description keyword match (0–10)
        if (empDescWords.length > 0 && jobs.length > 0) {
          let bestDescScore = 0;
          for (const job of jobs) {
            const jobText =
              `${job.title ?? ''} ${job.description ?? ''} ${job.skillsRequired ?? ''}`.toLowerCase();
            const matched = empDescWords.filter((w) =>
              jobText.includes(w),
            ).length;
            bestDescScore = Math.max(
              bestDescScore,
              matched / empDescWords.length,
            );
          }
          score += bestDescScore * 10;
        }

        // Factor 5: Location match (0–5)
        if (
          employee?.location &&
          company.location &&
          employee.location.toLowerCase().trim() ===
            company.location.toLowerCase().trim()
        ) {
          score += 5;
        }

        // Education bonus: only when BOTH employee has education AND job specifies a requirement
        if (empMaxDegreeRank > 0 && jobs.length > 0) {
          let bestEduScore = 0;
          for (const job of jobs) {
            const required = this.normalizeDegree(job.educationRequired ?? '');
            if (required === 0) continue; // skip jobs with no stated requirement
            if (empMaxDegreeRank >= required)
              bestEduScore = Math.max(bestEduScore, 5);
            else if (empMaxDegreeRank === required - 1)
              bestEduScore = Math.max(bestEduScore, 2);
          }
          score += bestEduScore;
        }

        // Experience bonus: only when BOTH employee has years stated AND job specifies a requirement
        if (empYears > 0 && jobs.length > 0) {
          let bestExpScore = 0;
          for (const job of jobs) {
            const required = this.extractYears(job.experienceRequired ?? '');
            if (required === 0) continue; // skip jobs with no stated requirement
            if (empYears >= required) bestExpScore = Math.max(bestExpScore, 5);
            else if (empYears >= required - 1)
              bestExpScore = Math.max(bestExpScore, 2);
          }
          score += bestExpScore;
        }

        return { user, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // MIN_SCORE filters out companies that are truly unrelated (e.g. healthcare for a developer)
      // while keeping companies that haven't fully filled their profile but are still relevant.
      const MIN_SCORE = 10;
      const recommendations = scored
        .filter(({ score }) => score >= MIN_SCORE)
        .map(
          ({ user }) =>
            new CompanyResponseDTO({
              ...user.company,
              openPositions: (user.company?.openPositions ?? []).map(
                (job) => new JobPositionResponseDTO(job),
              ),
            }),
        );

      await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);
      return recommendations;
    } catch (error) {
      this.logger.warn(
        `Employee recommendations unavailable for ${employeeId}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    const { companyId } = companyRecommendationsDTO;
    const cacheKey = this.redisService.generateListKey(
      'company-recommendations',
      { companyId },
    );
    const cached = await this.redisService.get<any[]>(cacheKey);

    if (cached) {
      this.logger.info(`Company ${companyId} recommendations cache HIT`);
      return cached;
    }

    this.logger.info(`Company ${companyId} recommendations cache MISS`);

    try {
      // 1. Load company with career scopes and full open position requirements.
      //    Include embeddings for semantic Factor 1 (career scopes) and
      //    Factor 3 (job title embeddings for open positions).
      const companyUser = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.company', 'company')
        .leftJoinAndSelect('company.careerScopes', 'cmpCareerScopes')
        .addSelect('cmpCareerScopes.embedding')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .addSelect('openPositions.titleEmbedding')
        .where('company.id = :companyId', { companyId })
        .getOne();

      const company = companyUser?.company ?? null;
      const jobs = company?.openPositions ?? [];

      // Aggregate required skills across all open positions
      const allRequiredSkills = new Set<string>();
      for (const job of jobs) {
        (job.skillsRequired ?? '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach((s) => allRequiredSkills.add(s));
      }

      // Highest education required across all jobs
      const maxRequiredDegree = Math.max(
        0,
        ...jobs.map((j) => this.normalizeDegree(j.educationRequired ?? '')),
      );

      // Minimum years required across all jobs (take lowest so more candidates qualify)
      const minRequiredYears = Math.min(
        ...jobs
          .map((j) => this.extractYears(j.experienceRequired ?? ''))
          .filter((y) => y > 0),
        999,
      );

      // 2. Get employee IDs the company has already liked
      const likedMatches = await this.jobMatchingRepository.find({
        where: { company: { id: companyId }, companyLiked: true },
        relations: ['employee'],
      });
      const likedEmployeeIds = likedMatches.map((m) => m.employee.id);

      // 3. Candidate pool: all employees with a profile.
      //    Scoring determines relevance — a broad pool ensures no relevant candidate is missed
      //    just because their career scopes aren't tagged. MIN_SCORE filters the truly unrelated.
      const allEmployeesQb = this.userRepository
        .createQueryBuilder('user')
        .select('user.id', 'userId')
        .innerJoin('user.employee', 'employee')
        .groupBy('user.id');

      if (likedEmployeeIds.length > 0) {
        allEmployeesQb.andWhere('employee.id NOT IN (:...likedEmployeeIds)', {
          likedEmployeeIds,
        });
      }

      const candidateRows = await allEmployeesQb.getRawMany<{
        userId: string;
      }>();
      const userIds = candidateRows.map((r) => r.userId);
      if (userIds.length === 0) return [];

      // 4. Load full employee profile data for scoring.
      //    Include career scope embeddings (Factor 1) and job title embedding (Factor 3).
      const users = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.employee', 'employee')
        .addSelect('employee.jobEmbedding')
        .leftJoinAndSelect('employee.careerScopes', 'careerScopes')
        .addSelect('careerScopes.embedding')
        .leftJoinAndSelect('employee.skills', 'skills')
        .leftJoinAndSelect('employee.experiences', 'experiences')
        .leftJoinAndSelect('employee.educations', 'educations')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      // Build text corpus from all job titles + descriptions + skills for content matching
      const jobTextCorpus = jobs
        .map(
          (j) =>
            `${j.title ?? ''} ${j.description ?? ''} ${j.skillsRequired ?? ''}`,
        )
        .join(' ')
        .toLowerCase();
      const jobTitleWords = jobs.flatMap((j) =>
        (j.title ?? '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );

      // 5. Multi-factor weighted scoring (max 100 pts)
      //    Factor 1: Career scope overlap        0–35  (field match)
      //    Factor 2: Skill match ratio            0–30  (specific skill fit)
      //    Factor 3: Job title/experience match   0–20  (role relevance)
      //    Factor 4: Description content match   0–10  (context fit)
      //    Factor 5: Location match               0–5
      //    Education/Experience: bonus only when BOTH sides have data
      const scored = users.map((user) => {
        const emp = user.employee;
        let score = 0;

        // Factor 1: Career scope semantic similarity (0–35)
        // Uses pgvector cosine similarity so "Full Stack Development" ↔
        // "Backend Developer" ↔ "Software Engineer" all score correctly.
        // Falls back to exact ID overlap when embeddings are unavailable.
        score += scopeSetSimilarityScore(
          company?.careerScopes ?? [],
          emp.careerScopes ?? [],
          35,
        );

        // Factor 2: Skill match ratio — how many required skills the employee has (0–30)
        const empSkillNames = (emp.skills ?? []).map((s) =>
          s.name.toLowerCase().trim(),
        );
        if (allRequiredSkills.size > 0 && empSkillNames.length > 0) {
          const matched = [...allRequiredSkills].filter((s) =>
            empSkillNames.includes(s),
          ).length;
          score += (matched / allRequiredSkills.size) * 30;
        }

        // Factor 3: Job title semantic match (0–20)
        // Uses pgvector cosine similarity between employee's job title/position
        // and the company's open position titles.
        // Falls back to keyword overlap when embeddings are missing.
        const empJobEmbeddingCandidate = parseEmbedding(
          (emp as any)?.jobEmbedding,
        );
        if (empJobEmbeddingCandidate) {
          score += jobTitleSimilarityScore(
            empJobEmbeddingCandidate,
            jobs as any[],
            20,
          );
        } else {
          // Keyword fallback
          const allEmpTitles = [
            (emp.job ?? '').toLowerCase(),
            ...(emp.experiences ?? []).map((e) =>
              (e.title ?? '').toLowerCase(),
            ),
          ].filter(Boolean);
          if (allEmpTitles.length > 0 && jobTitleWords.length > 0) {
            const empTitleAllWords = allEmpTitles.flatMap((t) =>
              t.split(/\s+/).filter((w) => w.length > 3),
            );
            const matched = empTitleAllWords.filter((w) =>
              jobTitleWords.includes(w),
            ).length;
            const ratio = Math.min(
              1,
              matched / Math.max(jobTitleWords.length, empTitleAllWords.length),
            );
            score += ratio * 20;
          }
        }

        // Factor 4: Description / profile content match (0–10)
        const empDescWords = this.extractKeywords(emp.description ?? '');
        if (empDescWords.length > 0 && jobTextCorpus) {
          const matched = empDescWords.filter((w) =>
            jobTextCorpus.includes(w),
          ).length;
          score += (matched / empDescWords.length) * 10;
        }

        // Factor 5: Location match (0–5)
        if (
          emp.location &&
          company?.location &&
          emp.location.toLowerCase().trim() ===
            company.location.toLowerCase().trim()
        ) {
          score += 5;
        }

        // Education bonus: only when BOTH employee has education AND job specifies a requirement
        const empMaxDegree = Math.max(
          0,
          ...(emp.educations ?? []).map((e) => this.normalizeDegree(e.degree)),
        );
        if (empMaxDegree > 0 && maxRequiredDegree > 0) {
          if (empMaxDegree >= maxRequiredDegree) score += 5;
          else if (empMaxDegree === maxRequiredDegree - 1) score += 2;
        }

        // Experience bonus: only when BOTH employee has years stated AND job specifies a requirement
        const empYears = this.extractYears(emp.yearsOfExperience ?? '');
        if (empYears > 0 && minRequiredYears > 0 && minRequiredYears !== 999) {
          if (empYears >= minRequiredYears) score += 5;
          else if (empYears >= minRequiredYears - 1) score += 2;
        }

        // Availability bonus (0–5)
        if (
          emp.availability &&
          emp.availability.toLowerCase() !== 'unavailable'
        ) {
          score += 5;
        }

        return { user, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const MIN_SCORE = 10;
      const recommendations = scored
        .filter(({ score }) => score >= MIN_SCORE)
        .map(({ user }) => new EmployeeResponseDTO(user.employee));

      await this.redisService.set(cacheKey, recommendations, CACHE_TTL.LONG);
      return recommendations;
    } catch (error) {
      this.logger.warn(
        `Company recommendations unavailable for ${companyId}: ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Maps a degree string to a numeric rank for comparison.
   * Higher rank = higher education level.
   */
  private normalizeDegree(degree: string): number {
    const d = (degree ?? '').toLowerCase();
    if (d.includes('phd') || d.includes('doctor')) return 5;
    if (d.includes('master')) return 4;
    if (
      d.includes('bachelor') ||
      d.includes('b.sc') ||
      d.includes('b.a') ||
      d.includes('undergraduate') ||
      d.includes('degree')
    )
      return 3;
    if (d.includes('associate') || d.includes('diploma')) return 2;
    if (d.includes('high school') || d.includes('secondary')) return 1;
    return 0;
  }

  /**
   * Extracts the first integer from an experience string like "3 years", "3-5 years", "5+ years".
   */
  private extractYears(text: string): number {
    if (!text) return 0;
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private static readonly STOP_WORDS = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'have',
    'this',
    'from',
    'they',
    'will',
    'been',
    'more',
    'when',
    'also',
    'into',
    'than',
    'then',
    'some',
    'what',
    'which',
    'there',
    'their',
    'about',
    'would',
    'other',
    'after',
    'first',
    'well',
    'very',
    'even',
    'such',
    'most',
    'over',
    'your',
    'our',
  ]);

  /**
   * Extracts meaningful keywords from a text — words longer than 3 chars, not stop words.
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];
    return [
      ...new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !UserService.STOP_WORDS.has(w)),
      ),
    ];
  }
}
