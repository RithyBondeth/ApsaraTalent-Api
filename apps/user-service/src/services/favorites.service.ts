import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
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
  EmployeeResponseDTO,
  JobPositionResponseDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { IFavoritesService } from '@app/contracts/interfaces/service/user-service.interface';

/**
 * Favourite/unfavourite relationships in both directions, plus their counts
 * and listings. Split out of UserService, which had grown to 1,717 lines
 * spanning three unrelated concerns.
 */
@Injectable()
export class FavoritesService implements IFavoritesService {
  constructor(
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmpRepository: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmpRepository: Repository<CompanyFavoriteEmployee>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
}
