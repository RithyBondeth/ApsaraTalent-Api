import { Employee } from '@app/common/database/entities/employee/employee.entity';
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
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  EmployeeIdDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IFindEmployeeService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import {
  generateEmployeeKey,
  generateListKey,
  fingerprintIds,
} from '@app/common/redis/redis-keys.util';

@Injectable()
export class FindEmployeeService implements IFindEmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
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

  async findAll(paginationDTO: PaginationDTO): Promise<EmployeeResponseDTO[]> {
    const { skip = 0, limit = 10, requesterId } = paginationDTO;

    const blockedUserIds = requesterId
      ? await this.getBlockedCounterpartUserIds(requesterId)
      : [];

    // Resolve blocked user ids -> employee ids so we can exclude by the
    // employee's OWN primary key. Filtering by a relation column together with
    // skip/take + one-to-many joins is unreliable in TypeORM, so we avoid it.
    let excludeEmployeeIds: string[] = [];
    if (blockedUserIds.length > 0) {
      const blockedEmployees = await this.employeeRepository.find({
        where: { user: { id: In(blockedUserIds) } },
        select: { id: true },
      });
      excludeEmployeeIds = blockedEmployees.map((e) => e.id);
    }

    // Filtered results are cached under a key derived from the exclusion set
    // rather than skipping the cache, so a user who has blocked anyone is not
    // condemned to the full uncached query on every page load. Blocking and
    // unblocking both clear `employee:list:*` (moderation.service.ts), which
    // covers these keys too, so an unblocked profile reappears immediately
    // rather than waiting out the TTL — the concern that motivated the bypass.
    const hasFilter = excludeEmployeeIds.length > 0;
    const excludeFingerprint = fingerprintIds(excludeEmployeeIds);
    const cacheKey = generateListKey('employee', {
      skip,
      limit,
      // Omitted entirely when nothing is excluded, so the unfiltered key is
      // byte-identical to the one already in Redis.
      ...(excludeFingerprint ? { exclude: excludeFingerprint } : {}),
    });

    const cached = await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);
    if (cached) {
      this.logger.info('All employees list cache HIT');
      return cached;
    }

    this.logger.info('All employees cache MISS');

    try {
      const qb = this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.skills', 'skills')
        .leftJoinAndSelect('employee.careerScopes', 'careerScopes')
        .leftJoinAndSelect('employee.experiences', 'experiences')
        .leftJoinAndSelect('employee.socials', 'socials')
        .leftJoinAndSelect('employee.educations', 'educations')
        .where('employee.isHide = false')
        // Discovery: hide suspended and banned employees.
        .andWhere(activeUserSql('user'))
        .skip(skip)
        .take(limit);

      if (hasFilter) {
        qb.andWhere('employee.id NOT IN (:...excludeEmployeeIds)', {
          excludeEmployeeIds,
        });
      }

      const employees = await qb.getMany();
      if (!employees)
        throw new RpcException({
          message: 'There are no employees available',
          statusCode: 404,
        });

      const result = employees.map((emp) => new EmployeeResponseDTO(emp));

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while fetching all of the employees',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching all of the employees',
        statusCode: 500,
      });
    }
  }

  async findOneById(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<EmployeeResponseDTO> {
    const { employeeId, requesterId } = employeeIdDTO;

    // Instagram/Facebook-style block: if a block exists in either direction
    // between the viewer and this profile's owner, the profile is unavailable.
    if (requesterId) {
      const targetUser = await this.userRepository.findOne({
        where: { employee: { id: employeeId } },
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

    const cacheKey = generateEmployeeKey('detail', employeeId);
    const cached = await this.redisService.get<EmployeeResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info(`Employee ${employeeId} cache HIT`);
      return cached;
    }

    this.logger.info(`Employee ${employeeId} cache MISS`);

    try {
      const user = await this.userRepository.findOne({
        where: {
          employee: {
            id: employeeId,
          },
        },
        relations: [
          'employee.skills',
          'employee.careerScopes',
          'employee.experiences',
          'employee.socials',
          'employee.educations',
        ],
      });
      // An unknown employee id must be a 404, not a TypeError on
      // `user.employee`. The block check above already guards this way.
      if (!user?.employee) {
        throw new RpcException({
          statusCode: 404,
          message: 'There is no employee with this id',
        });
      }

      const result = new EmployeeResponseDTO({
        ...user.employee,
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
          'An error occurred while fetching an employee',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while fetching an employee',
        statusCode: 500,
      });
    }
  }

  async countAllEmployees(): Promise<CountAllUsersResponseDTO> {
    const cacheKey = 'apsaratalent:user-service:employee:count:all';
    const cached =
      await this.redisService.get<CountAllUsersResponseDTO>(cacheKey);

    if (cached) {
      this.logger.info('All employees count cache HIT');
      return cached;
    }

    this.logger.info('All employees count cache MISS');

    try {
      const totalEmployees = await this.employeeRepository.count({
        where: { isHide: false },
      });
      const result = { totalEmployees };

      await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);

      return new CountAllUsersResponseDTO(result);
    } catch (error) {
      this.logger.error(
        (error as Error)?.message ||
          'An error occurred while counting all employees',
      );
      throw new RpcException({
        message:
          (error as Error)?.message ||
          'An error occurred while counting all employees',
        statusCode: 500,
      });
    }
  }
}
