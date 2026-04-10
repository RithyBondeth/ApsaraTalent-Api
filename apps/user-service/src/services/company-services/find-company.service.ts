import { Company } from '@app/common/database/entities/company/company.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  JobPositionDTO,
} from '../../dtos/user-response.dto';

import { IFindCompanyService } from '@app/contracts/interfaces/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/cache-ttl.constant';

@Injectable()
export class FindCompanyService implements IFindCompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async findAll(pagination: UserPaginationDTO): Promise<CompanyResponseDTO[]> {
    const cacheKey = this.redisService.generateListKey('company', pagination);
    const cached = await this.redisService.get<CompanyResponseDTO[]>(cacheKey);

    if (cached) {
      this.logger.info('All Companies cache HIT');
      return cached;
    }

    this.logger.info('All Companies cache MISS');

    try {
      const companies = await this.companyRepository.find({
        relations: [
          'openPositions',
          'benefits',
          'values',
          'careerScopes',
          'socials',
          'images',
        ],
        skip: pagination?.skip || 0,
        take: pagination?.limit || 10,
      });
      if (!companies)
        throw new RpcException({
          message: 'There are no companies available.',
          statusCode: 404,
        });

      const result = companies.map((company) => {
        const transformedCompany = {
          ...company,
          openPositions:
            company.openPositions?.map((job) => new JobPositionDTO(job)) ?? [],
        };
        return new CompanyResponseDTO(transformedCompany);
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching all of the companies.',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while fetching all of the companies.',
        statusCode: 500,
      });
    }
  }

  async countAllCompanies(): Promise<CountAllUsersResponseDTO> {
    const cacheKey = 'apsaratalent:user-service:company:count:all';
    const cached =
      await this.redisService.get<CountAllUsersResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info('All companies count cache HIT');
      return cached;
    }

    this.logger.info('All companies count cache MISS');

    try {
      const totalCompanies = await this.companyRepository.count();
      const result = { totalCompanies };

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return new CountAllUsersResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting all companies.',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while counting all companies.',
        statusCode: 500,
      });
    }
  }

  async findOneById(companyId: string): Promise<CompanyResponseDTO> {
    const cacheKey = this.redisService.generateCompanyKey('detail', companyId);
    const cached = await this.redisService.get<CompanyResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`Company ${companyId} cache HIT`);
      return cached;
    }

    this.logger.info(`Company ${companyId} cache MISS`);

    try {
      const user = await this.userRepository.findOne({
        where: {
          company: {
            id: companyId,
          },
        },
        relations: [
          'company.openPositions',
          'company.benefits',
          'company.values',
          'company.careerScopes',
          'company.socials',
          'company.images',
        ],
      });

      const result = new CompanyResponseDTO({
        ...user.company,
        email: user.email,
        openPositions:
          user.company.openPositions?.map((job) => new JobPositionDTO(job)) ??
          [],
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching a company.',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while fetching a company.',
        statusCode: 500,
      });
    }
  }
}
