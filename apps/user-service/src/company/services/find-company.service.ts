import { Company } from '@app/common/database/entities/company/company.entity';
import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, Repository } from 'typeorm';
import { activeUserSql } from '@app/common/utils/discovery-status.util';
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
  fingerprintIds,
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
   * Build the response DTO, including the nested position DTOs.
   *
   * `@Type(() => JobPositionResponseDTO)` on `openPositions` only takes effect
   * under class-transformer's own `plainToInstance`, not a hand-written
   * constructor, so the nested instances have to be created explicitly or their
   * `@Expose()` accessors never exist. One place for it, since both the cache
   * hit and the cache miss need exactly the same shape.
   */
  private toCompanyResponse(source: object): CompanyResponseDTO {
    const { openPositions } = source as { openPositions?: unknown[] | null };
    return new CompanyResponseDTO({
      ...source,
      openPositions: (openPositions ?? []).map(
        (job) => new JobPositionResponseDTO(job as never),
      ),
    } as never);
  }

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

    // Filtered results are cached under a key derived from the exclusion set
    // rather than skipping the cache, so a user who has blocked anyone is not
    // condemned to the full uncached query on every page load. Blocking and
    // unblocking both clear `company:list:*` (moderation.service.ts), which
    // covers these keys too, so an unblocked profile reappears immediately
    // rather than waiting out the TTL — the concern that motivated the bypass.
    const hasFilter = excludeCompanyIds.length > 0;
    const excludeFingerprint = fingerprintIds(excludeCompanyIds);
    const cacheKey = generateListKey('company', {
      skip,
      limit,
      // Omitted entirely when nothing is excluded, so the unfiltered key is
      // byte-identical to the one already in Redis.
      ...(excludeFingerprint ? { exclude: excludeFingerprint } : {}),
    });

    const cached = await this.redisService.get<CompanyResponseDTO[]>(cacheKey);
    if (cached) {
      this.logger.info('All Companies cache HIT');
      return cached;
    }

    this.logger.info('All Companies cache MISS');

    try {
      const qb = this.companyRepository
        .createQueryBuilder('company')
        .leftJoinAndSelect('company.user', 'user')
        .leftJoinAndSelect('company.openPositions', 'openPositions')
        .leftJoinAndSelect('company.benefits', 'benefits')
        .leftJoinAndSelect('company.values', 'values')
        .leftJoinAndSelect('company.careerScopes', 'careerScopes')
        .leftJoinAndSelect('company.socials', 'socials')
        .leftJoinAndSelect('company.images', 'images')
        // Discovery: hide suspended and banned companies. Existing
        // relationships — matches, applications, chats — read through other
        // paths and are not affected.
        .where(activeUserSql('user'))
        .skip(skip)
        .take(limit);

      if (hasFilter) {
        qb.andWhere('company.id NOT IN (:...excludeCompanyIds)', {
          excludeCompanyIds,
        });
      }

      const companies = await qb.getMany();
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

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

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
      // Rebuilt rather than returned as-is. Redis holds whatever
      // JSON.stringify produced from the DTO instance, and that skips
      // prototype accessors — so the cached copy has `experienceRequired` but
      // not the `experience` the API actually publishes. Returning it raw made
      // a cache hit answer with a different shape than a miss: the derived
      // fields (experience, education, skills, deadlineDate, postedDate)
      // silently vanished, and the internal column names leaked in their
      // place. Reconstructing restores the getters from the raw fields the
      // cache did keep.
      return this.toCompanyResponse(cached);
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

      const result = this.toCompanyResponse({
        ...user.company,
        email: user.email,
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
