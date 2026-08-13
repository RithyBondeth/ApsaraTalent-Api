import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  EmployeeResponseDTO,
  JobPositionResponseDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { IFavoritesQueryService } from '@app/contracts/interfaces/service/user-service.interface';
import {
  generateCompanyFavoriteCountKey,
  generateCompanyFavoritesKey,
  generateEmployeeFavoriteCountKey,
  generateEmployeeFavoritesKey,
} from '@app/common/redis/redis-keys.util';

/**
 * Read side of favourites: cached listings and counts for both directions.
 * Mutations and their invalidation events live in FavoritesService.
 */
@Injectable()
export class FavoritesQueryService implements IFavoritesQueryService {
  constructor(
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly empFavoriteCmpRepository: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly cmpFavoriteEmpRepository: Repository<CompanyFavoriteEmployee>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async findAllEmployeeFavorites(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<EmployeeFavoritesListItemDTO[]> {
    const { eid } = employeeFavoriteLookupDTO;
    const cacheKey = generateEmployeeFavoritesKey(eid);
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
        (error as Error)?.message ||
          'An error occurred while finding employee favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while finding employee favorites.',
      });
    }
  }

  async findAllCompanyFavorites(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<CompanyFavoritesListItemDTO[]> {
    const { cid } = companyFavoriteLookupDTO;
    const cacheKey = generateCompanyFavoritesKey(cid);
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
        (error as Error)?.message ||
          'An error occurred while finding company favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while finding company favorites.',
      });
    }
  }

  async countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { cid } = companyFavoriteLookupDTO;
    const cacheKey = generateCompanyFavoriteCountKey(cid);
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
        (error as Error)?.message ||
          'An error occurred while counting company favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while counting company favorites.',
      });
    }
  }

  async countEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    const { eid } = employeeFavoriteLookupDTO;
    const cacheKey = generateEmployeeFavoriteCountKey(eid);
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
        (error as Error)?.message ||
          'An error occurred while counting employee favorites.',
      );
      throw new RpcException({
        statusCode: 500,
        message:
          (error as Error)?.message ||
          'An error occurred while counting employee favorites.',
      });
    }
  }
}
