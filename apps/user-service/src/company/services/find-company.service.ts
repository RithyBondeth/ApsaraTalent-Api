import { Company } from '@app/common/database/entities/company/company.entity';
import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, Not, Repository } from 'typeorm';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  JobPositionResponseDTO,
  CompanyIdDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IFindCompanyService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import {
  generateCompanyKey,
  generateListKey,
} from '@app/common/redis/redis-keys.util';

@Injectable()
export class FindCompanyService implements IFindCompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly blockRepository: Repository<UserBlock>,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  /**
   * User ids blocked in either direction with `userId` — used to hide blocked
   * profiles from feed listings (mutual invisibility).
   */
  private async getBlockedCounterpartUserIds(
    userId: string,
  ): Promise<string[]> {
    // Read the FK columns directly. `find()` with a relation-only `where` joins
    // for the condition but does not hydrate blocker/blocked, so reading
    // `row.blocker.id` off the result silently yielded undefined for every row
    // and this filter never excluded anyone. Same approach as
    // moderation.service.ts, which is also cheaper — no User rows are loaded
    // just to collect their ids.
    const rows = await this.blockRepository
      .createQueryBuilder('ub')
      .select('ub."blockerId"', 'blockerId')
      .addSelect('ub."blockedId"', 'blockedId')
      .where('ub."blockerId" = :userId OR ub."blockedId" = :userId', { userId })
      .getRawMany<{ blockerId: string; blockedId: string }>();
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.blockerId && r.blockerId !== userId) ids.add(r.blockerId);
      if (r.blockedId && r.blockedId !== userId) ids.add(r.blockedId);
    }
    return [...ids];
  }

  async findAll(paginationDTO: PaginationDTO): Promise<CompanyResponseDTO[]> {
    const { skip = 0, limit = 10, requesterId } = paginationDTO;

    const blockedUserIds = requesterId
      ? await this.getBlockedCounterpartUserIds(requesterId)
      : [];

    // Resolve blocked user ids -> company ids so we can exclude by the
    // company's OWN primary key (relation-column filtering with skip/take +
    // one-to-many joins is unreliable in TypeORM).
    let excludeCompanyIds: string[] = [];
    if (blockedUserIds.length > 0) {
      const blockedCompanies = await this.companyRepository.find({
        where: { user: { id: In(blockedUserIds) } },
        select: { id: true },
      });
      excludeCompanyIds = blockedCompanies.map((c) => c.id);
    }

    // Bypass the cache (read + write) when a block filter is active so filtered
    // results never get cached under the shared key (an unblocked user would
    // otherwise stay hidden until TTL; pattern invalidation is a no-op here).
    const hasFilter = excludeCompanyIds.length > 0;
    const cacheKey = generateListKey('company', {
      skip,
      limit,
    });

    if (!hasFilter) {
      const cached =
        await this.redisService.get<CompanyResponseDTO[]>(cacheKey);
      if (cached) {
        this.logger.info('All Companies cache HIT');
        return cached;
      }
    }

    this.logger.info('All Companies cache MISS');

    try {
      const companies = await this.companyRepository.find({
        where: hasFilter ? { id: Not(In(excludeCompanyIds)) } : {},
        relations: [
          'openPositions',
          'benefits',
          'values',
          'careerScopes',
          'socials',
          'images',
        ],
        skip,
        take: limit,
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
            company.openPositions?.map(
              (job) => new JobPositionResponseDTO(job),
            ) ?? [],
        };
        return new CompanyResponseDTO(transformedCompany);
      });

      if (!hasFilter) {
        await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);
      }

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching all of the companies.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
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
        (error as Error)?.message ||
          'An error occurred while counting all companies.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while counting all companies.',
        statusCode: 500,
      });
    }
  }

  async findOneById(companyIdDTO: CompanyIdDTO): Promise<CompanyResponseDTO> {
    const { companyId, requesterId } = companyIdDTO;

    // Instagram/Facebook-style block: if a block exists in either direction
    // between the viewer and this profile's owner, the profile is unavailable.
    if (requesterId) {
      const targetUser = await this.userRepository.findOne({
        where: { company: { id: companyId } },
        select: { id: true },
      });
      if (!targetUser) {
        throw new RpcException({
          statusCode: 404,
          message: 'This profile is not available.',
        });
      }
      if (requesterId !== targetUser.id) {
        const blocked = await this.blockRepository.exists({
          where: [
            { blocker: { id: requesterId }, blocked: { id: targetUser.id } },
            { blocker: { id: targetUser.id }, blocked: { id: requesterId } },
          ],
        });
        if (blocked) {
          throw new RpcException({
            statusCode: 404,
            message: 'This profile is not available.',
          });
        }
      }
    }

    const cacheKey = generateCompanyKey('detail', companyId);
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

      // An unknown company id must be a 404, not a TypeError on `user.company`.
      // The block check above already guards this way; this lookup did not.
      if (!user?.company) {
        throw new RpcException({
          statusCode: 404,
          message: 'There is no company with this id',
        });
      }

      const result = new CompanyResponseDTO({
        ...user.company,
        email: user.email,
        openPositions:
          user.company.openPositions?.map(
            (job) => new JobPositionResponseDTO(job),
          ) ?? [],
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);

      return result;
    } catch (error) {
      // Preserve deliberate status codes (e.g. the 404 above); only genuinely
      // unexpected failures become a 500.
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching a company.',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching a company.',
        statusCode: 500,
      });
    }
  }
}
