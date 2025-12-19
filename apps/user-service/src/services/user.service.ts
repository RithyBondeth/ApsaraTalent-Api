import { User } from '@app/common/database/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  EmployeeResponseDTO,
  JobPositionDTO,
  UserResponseDTO,
} from '../dtos/user-response.dto';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { RpcException } from '@nestjs/microservices';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CareerScope)
    private readonly careerScopeRepository: Repository<CareerScope>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmpRepository: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmpRepository: Repository<CompanyFavoriteEmployee>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllUsers(): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateListKey('user', {});
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All users cache HIT');
      return cached;
    }

    this.logger.info('All users cache MISS');

    try {
      const users = await this.userRepository.find({
        relations: [
          'employee',
          'employee.skills',
          'employee.experiences',
          'employee.educations',
          'employee.careerScopes',
          'employee.socials',
          'company',
          'company.openPositions',
          'company.careerScopes',
          'company.benefits',
          'company.values',
          'company.socials',
          'company.images',
        ],
      });
      if (!users)
        throw new RpcException({
          statusCode: 404,
          message: 'There are no users available!',
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
                (job) => new JobPositionDTO(job),
              ),
            }),
          }),
      );

      // Cache for 2 minutes
      await this.redisService.set(cacheKey, result, 120000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding all the users.',
      });
    }
  }

  async findOneUserByID(userId: string): Promise<UserResponseDTO> {
    const cacheKey = this.redisService.generateUserKey('detail', userId);
    const cached = await this.redisService.get<UserResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`User ${userId} cache HIT`);
      return cached;
    }

    this.logger.info(`User ${userId} cache MISS`);

    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: [
          'employee',
          'employee.skills',
          'employee.experiences',
          'employee.educations',
          'employee.careerScopes',
          'employee.socials',
          'company',
          'company.openPositions',
          'company.careerScopes',
          'company.benefits',
          'company.values',
          'company.socials',
          'company.images',
        ],
      });
      if (!user)
        throw new RpcException({
          statusCode: 404,
          message: 'There is no user with this id!',
        });

      const result: UserResponseDTO = new UserResponseDTO({
        ...user,
        employee: user.employee
          ? new EmployeeResponseDTO(user.employee)
          : undefined,
        company: new CompanyResponseDTO({
          ...user.company,
          openPositions: user.company?.openPositions?.map(
            (job) => new JobPositionDTO(job),
          ),
        }),
      });

      // Cache for 5 minutes
      await this.redisService.set(cacheKey, result, 300000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding user by id.',
      });
    }
  }

  async employeeFavoriteCompany(
    eid: string,
    cid: string,
  ): Promise<{ message: string }> {
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
          message: 'Already favorited!',
        });

      const favorite = this.empFavoriteCmpRepository.create({
        employee: { id: eid },
        company: { id: cid },
      });

      await this.empFavoriteCmpRepository.save(favorite);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(this.redisService.generateEmployeeFavoritesKey(eid)),
        this.redisService.del(this.redisService.generateEmployeeFavoriteCountKey(eid)),
        this.redisService.del(this.redisService.generateCompanyFavoritesKey(cid)),
        this.redisService.del(this.redisService.generateCompanyFavoriteCountKey(cid)),
      ]);

      // ✅ Emit events for other services if needed
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} favorited company ${cid}`);

      return { message: 'Successfully added company to favorites' };
    } catch (error) {
      this.logger.error(error.message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while favoriting company.',
      });
    }
  }

  async employeeUnfavoriteCompany(
    eid: string,
    cid: string,
    favoriteId: string,
  ): Promise<{ message: string }> {
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
          message: "Favorite not found or you don't have permission to remove it.",
          statusCode: 404,
        });

      await this.empFavoriteCmpRepository.remove(favoriteToRemove);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(this.redisService.generateEmployeeFavoritesKey(eid)),
        this.redisService.del(this.redisService.generateEmployeeFavoriteCountKey(eid)),
        this.redisService.del(this.redisService.generateCompanyFavoritesKey(cid)),
        this.redisService.del(this.redisService.generateCompanyFavoriteCountKey(cid)),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });

      this.logger.info(`Employee ${eid} unfavorited company ${cid}`);

      return { message: 'Successfully removed company from favorites' };
    } catch (error) {
      this.logger.error(error.message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while unfavoriting company.',
      });
    }
  }

  async companyFavoriteEmployee(
    cid: string,
    eid: string,
  ): Promise<{ message: string }> {
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
        this.redisService.del(this.redisService.generateCompanyFavoritesKey(cid)),
        this.redisService.del(this.redisService.generateCompanyFavoriteCountKey(cid)),
        this.redisService.del(this.redisService.generateEmployeeFavoritesKey(eid)),
        this.redisService.del(this.redisService.generateEmployeeFavoriteCountKey(eid)),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} favorited employee ${eid}`);

      return { message: 'Successfully added employee to favorites' };
    } catch (error) {
      this.logger.error(error.message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while favoriting employee.',
      });
    }
  }

  async companyUnfavoriteEmployee(
    cid: string,
    eid: string,
    favoriteId: string,
  ): Promise<{ message: string }> {
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
          message: "Favorite not found or you don't have permission to remove it.",
          statusCode: 404,
        });

      await this.cmpFavoriteEmpRepository.remove(favoriteToRemove);

      // ✅ Use helper methods for consistent cache invalidation
      await Promise.all([
        this.redisService.del(this.redisService.generateCompanyFavoritesKey(cid)),
        this.redisService.del(this.redisService.generateCompanyFavoriteCountKey(cid)),
        this.redisService.del(this.redisService.generateEmployeeFavoritesKey(eid)),
        this.redisService.del(this.redisService.generateEmployeeFavoriteCountKey(eid)),
      ]);

      // ✅ Emit events
      this.eventEmitter.emit('company.favorites.updated', { companyId: cid });
      this.eventEmitter.emit('employee.favorites.updated', { employeeId: eid });

      this.logger.info(`Company ${cid} unfavorited employee ${eid}`);

      return { message: 'Successfully removed employee from favorites' };
    } catch (error) {
      this.logger.error(error.message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while unfavoriting employee.',
      });
    }
  }

  async findAllEmployeeFavorites(eid: string): Promise<any> {
    // ✅ Use helper method
    const cacheKey = this.redisService.generateEmployeeFavoritesKey(eid);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      this.logger.info(`All employee ${eid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All employee ${eid} favorites cache MISS`);

    try {
      const allFavorites = await this.empFavoriteCmpRepository.find({
        where: { employee: { id: eid } },
        relations: ['company', 'company.openPositions'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result = [];
        // Cache empty result for 1 minute
        await this.redisService.set(cacheKey, result, 60000);
        return result;
      }

      const allFavoritesWithUsersId = await Promise.all(
        allFavorites.map(async (favorite) => {
          const user = await this.userRepository.findOne({
            where: {
              company: {
                id: favorite.company.id,
              },
            },
            select: ['id'],
          });
          return { ...favorite, userId: user?.id || null };
        }),
      );

      // Cache for 2 minutes
      await this.redisService.set(cacheKey, allFavoritesWithUsersId, 120000);

      return allFavoritesWithUsersId;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding employee favorites.',
      });
    }
  }

  async findAllCompanyFavorites(cid: string): Promise<any> {
    // ✅ Use helper method
    const cacheKey = this.redisService.generateCompanyFavoritesKey(cid);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      this.logger.info(`All company ${cid} favorites cache HIT`);
      return cached;
    }

    this.logger.info(`All company ${cid} favorites cache MISS`);

    try {
      const allFavorites = await this.cmpFavoriteEmpRepository.find({
        where: { company: { id: cid } },
        relations: ['employee', 'employee.skills'],
      });

      if (!allFavorites || allFavorites.length === 0) {
        const result = [];
        // Cache empty result for 1 minute
        await this.redisService.set(cacheKey, result, 60000);
        return result;
      }

      const allFavoritesWithUserId = await Promise.all(
        allFavorites.map(async (favorite) => {
          const user = await this.userRepository.findOne({
            where: {
              employee: {
                id: favorite.employee.id,
              },
            },
            select: ['id'],
          });
          return { ...favorite, userId: user?.id || null };
        }),
      );

      // Cache for 2 minutes
      await this.redisService.set(cacheKey, allFavoritesWithUserId, 120000);

      return allFavoritesWithUserId;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while finding company favorites.',
      });
    }
  }

  async countCompanyFavorite(cid: string): Promise<{ totalFavorites: number }> {
    // ✅ Use helper method
    const cacheKey = this.redisService.generateCompanyFavoriteCountKey(cid);
    const cached = await this.redisService.get<{ totalFavorites: number }>(cacheKey);

    if (cached) {
      this.logger.info(`Company ${cid} favorite count cache HIT`);
      return cached;
    }

    this.logger.info(`Company ${cid} favorite count cache MISS`);

    try {
      const countAllCompanyFavorites = await this.cmpFavoriteEmpRepository.count({
        where: { company: { id: cid } },
      });
      
      const result = { totalFavorites: countAllCompanyFavorites };

      // Cache for 5 minutes
      await this.redisService.set(cacheKey, result, 300000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while counting company favorites.',
      });
    }
  }

  async countEmployeeFavorite(eid: string): Promise<{ totalFavorites: number }> {
    // ✅ Use helper method
    const cacheKey = this.redisService.generateEmployeeFavoriteCountKey(eid);
    const cached = await this.redisService.get<{ totalFavorites: number }>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${eid} favorite count cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${eid} favorite count cache MISS`);

    try {
      const countAllEmployeeFavorites = await this.empFavoriteCmpRepository.count({
        where: { employee: { id: eid } },
      });
      
      const result = { totalFavorites: countAllEmployeeFavorites };

      // Cache for 5 minutes
      await this.redisService.set(cacheKey, result, 300000);

      return result;
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while counting employee favorites.',
      });
    }
  }

  async findAllCareerScopes(): Promise<Partial<CareerScope[]>> {
    const cacheKey = this.redisService.generateListKey('career-scopes', {});
    const cached = await this.redisService.get<Partial<CareerScope[]>>(cacheKey);

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
          message: 'No career scopes available!',
        });

      // Cache for 1 hour (rarely changes)
      await this.redisService.set(cacheKey, careerScopes, 3600000);

      return careerScopes;
    } catch (error) {
      this.logger.error(error.message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: 'An error occurred while finding career scopes.',
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
}