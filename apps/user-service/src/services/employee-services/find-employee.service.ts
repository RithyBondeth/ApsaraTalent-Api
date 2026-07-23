import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { In, Not, Repository } from 'typeorm';
import {
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  EmployeeIdDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { IFindEmployeeService } from '@app/contracts/interfaces/service/user-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

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
    const rows = await this.blockRepository.find({
      where: [{ blocker: { id: userId } }, { blocked: { id: userId } }],
    });
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.blocker?.id && r.blocker.id !== userId) ids.add(r.blocker.id);
      if (r.blocked?.id && r.blocked.id !== userId) ids.add(r.blocked.id);
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

    // When a block filter is active we BYPASS the cache (read + write) so that
    // filtered results never get stored under a shared key — otherwise an
    // unblocked user stays hidden until TTL. (Pattern-based invalidation is a
    // no-op with cache-manager v7, so we cannot rely on clearing it.)
    const hasFilter = excludeEmployeeIds.length > 0;
    const cacheKey = this.redisService.generateListKey('employee', {
      skip,
      limit,
    });

    if (!hasFilter) {
      const cached =
        await this.redisService.get<EmployeeResponseDTO[]>(cacheKey);
      if (cached) {
        this.logger.info('All employees list cache HIT');
        return cached;
      }
    }

    this.logger.info('All employees cache MISS');

    try {
      const employees = await this.employeeRepository.find({
        where: {
          isHide: false,
          ...(hasFilter ? { id: Not(In(excludeEmployeeIds)) } : {}),
        },
        relations: [
          'skills',
          'careerScopes',
          'experiences',
          'socials',
          'educations',
        ],
        skip,
        take: limit,
      });
      if (!employees)
        throw new RpcException({
          message: 'There are no employees available',
          statusCode: 404,
        });

      const result = employees.map((emp) => new EmployeeResponseDTO(emp));

      if (!hasFilter) {
        await this.redisService.set(cacheKey, result, CACHE_TTL.MEDIUM);
      }

      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching all of the employees',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
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

    const cacheKey = this.redisService.generateEmployeeKey(
      'detail',
      employeeId,
    );
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
        (error as Error).message ||
          'An error occurred while fetching an employee',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
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
        (error as Error).message ||
          'An error occurred while counting all employees',
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          'An error occurred while counting all employees',
        statusCode: 500,
      });
    }
  }
}
