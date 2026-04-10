import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { EmailService } from '@app/common/email/email.service';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { MatchDto } from '../dtos/match.dto';

import { IMatchingService } from '@app/contracts/interfaces/job-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';

@Injectable()
export class MatchingService implements IMatchingService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly employeeFavoriteCompanyRepo: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly companyFavoriteEmployeeRepo: Repository<CompanyFavoriteEmployee>,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  async employeeLikes(matchDto: MatchDto): Promise<any> {
    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: matchDto.eid },
          relations: ['user'],
        }),
        this.companyRepo.findOne({
          where: { id: matchDto.cid },
          relations: ['user'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      let match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: matchDto.eid },
          company: { id: matchDto.cid },
        },
        relations: ['employee', 'company'],
      });

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: true,
          companyLiked: false,
          isMatched: false,
        });
      } else {
        match.employeeLiked = true;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      // Tinder-style: remove from employee's saved companies when liked
      await this.employeeFavoriteCompanyRepo.delete({
        employee: { id: matchDto.eid },
        company: { id: matchDto.cid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDto.eid, matchDto.cid),
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(matchDto.eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(matchDto.eid),
        ),
      ]);

      // Notify the company about the like/match
      const companyUserId = company.user?.id;
      if (companyUserId) {
        const notificationPayload = becameMatched
          ? {
              userId: companyUserId,
              title: "It's a Match!",
              message: `${employee.username || employee.firstname} and your company liked each other!`,
              type: 'match',
              data: { employeeId: matchDto.eid, companyId: matchDto.cid },
              sendPush: true,
              senderAvatar: employee.avatar || null,
            }
          : {
              userId: companyUserId,
              title: 'New Like',
              message: `${employee.username || employee.firstname} liked your company!`,
              type: 'like',
              data: { employeeId: matchDto.eid, companyId: matchDto.cid },
              sendPush: true,
              senderAvatar: employee.avatar || null,
            };
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          notificationPayload,
        );
      }

      if (becameMatched) {
        this.emailService
          .sendEmail({
            from: company.user.email,
            to: employee.user.email,
            subject: 'Matched Message',
            text: `🎉 Match! ${employee.username} likes your company.`,
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to send match notification: ${err?.message || err}`,
            ),
          );
      }

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async companyLikes(matchDto: MatchDto): Promise<any> {
    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: matchDto.eid },
          relations: ['user'],
        }),
        this.companyRepo.findOne({
          where: { id: matchDto.cid },
          relations: ['user'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      let match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: matchDto.eid },
          company: { id: matchDto.cid },
        },
        relations: ['employee', 'company'],
      });

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: false,
          companyLiked: true,
          isMatched: false,
        });
      } else {
        match.companyLiked = true;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      // Tinder-style: remove from company's saved employees when liked
      await this.companyFavoriteEmployeeRepo.delete({
        company: { id: matchDto.cid },
        employee: { id: matchDto.eid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDto.eid, matchDto.cid),
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(matchDto.cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(matchDto.cid),
        ),
      ]);

      // Notify the employee about the like/match
      const employeeUserId = employee.user?.id;
      if (employeeUserId) {
        const notificationPayload = becameMatched
          ? {
              userId: employeeUserId,
              title: "It's a Match!",
              message: `${company.name} and you liked each other!`,
              type: 'match',
              data: { employeeId: matchDto.eid, companyId: matchDto.cid },
              sendPush: true,
              senderAvatar: company.avatar || null,
            }
          : {
              userId: employeeUserId,
              title: 'New Like',
              message: `${company.name} liked your profile!`,
              type: 'like',
              data: { employeeId: matchDto.eid, companyId: matchDto.cid },
              sendPush: true,
              senderAvatar: company.avatar || null,
            };
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          notificationPayload,
        );
      }

      if (becameMatched) {
        this.emailService
          .sendEmail({
            from: employee.user.email,
            to: company.user.email,
            subject: 'Apsara Talent - Matched Messages',
            text: `🎉 Match! ${company.name} likes your profile.`,
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to send match notification: ${err?.message || err}`,
            ),
          );
      }

      return saved;
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeLiked(eid: string): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-liked',
      eid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const employeeLiked = await this.jobMatchingRepo.find({
        where: { employee: { id: eid }, employeeLiked: true },
        relations: ['company', 'company.openPositions'],
      });

      if (!employeeLiked)
        throw new RpcException({
          message: 'Employee Liked not found',
          statusCode: 404,
        });

      const result = employeeLiked.map((e) => new UserResponseDTO(e.company));
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching the employee liked.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyLiked(cid: string): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-liked',
      cid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const companyLiked = await this.jobMatchingRepo.find({
        where: { company: { id: cid }, companyLiked: true },
        relations: ['employee', 'employee.skills'],
      });

      if (!companyLiked)
        throw new RpcException({
          message: 'Company Liked not found',
          statusCode: 404,
        });

      const result = companyLiked.map((c) => new UserResponseDTO(c.employee));
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching the company liked.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatching(eid: string): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching',
      eid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentEmployeeMatching = await this.jobMatchingRepo.find({
        where: { employee: { id: eid }, isMatched: true },
        relations: ['company.openPositions'],
      });

      if (!currentEmployeeMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentEmployeeMatching.map(
        (u) => new UserResponseDTO(u.company),
      );
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching the employee matching.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentCompanyMatching(cid: string): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching',
      cid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentCompanyMatching = await this.jobMatchingRepo.find({
        where: { company: { id: cid }, isMatched: true },
        relations: ['employee.skills'],
      });

      if (!currentCompanyMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentCompanyMatching.map(
        (u) => new UserResponseDTO(u.employee),
      );
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching the company matching.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeMatchingCount(eid: string): Promise<any> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching-count',
      eid,
    );
    const cached = await this.redisService.get<{ totalMatching: number }>(
      cacheKey,
    );
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: { employee: { id: eid }, isMatched: true },
      });
      const result = { totalMatching: count };
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting the current employee matching.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async getAnalytics(userId: string, role: 'employee' | 'company') {
    // No caching — dashboard should always show real-time data.
    try {
      const isEmployee = role === 'employee';
      const entityField = isEmployee ? 'employee' : 'company';
      const likeGivenField = isEmployee ? 'employeeLiked' : 'companyLiked';
      const likeReceivedField = isEmployee ? 'companyLiked' : 'employeeLiked';
      const favoriteRepo = isEmployee
        ? this.employeeFavoriteCompanyRepo
        : this.companyFavoriteEmployeeRepo;

      // ── Summary counts (parallel) ──
      const [
        totalLikesGiven,
        totalLikesReceived,
        totalMatches,
        totalFavorites,
      ] = await Promise.all([
        this.jobMatchingRepo.count({
          where: { [entityField]: { id: userId }, [likeGivenField]: true },
        }),
        this.jobMatchingRepo.count({
          where: { [entityField]: { id: userId }, [likeReceivedField]: true },
        }),
        this.jobMatchingRepo.count({
          where: { [entityField]: { id: userId }, isMatched: true },
        }),
        favoriteRepo.count({
          where: { [entityField]: { id: userId } },
        }),
      ]);

      const matchRate =
        totalLikesGiven > 0
          ? Math.round((totalMatches / totalLikesGiven) * 100)
          : 0;

      // ── Weekly activity (last 7 days) for bar chart ──
      const weeklyActivity = await this.getWeeklyActivity(
        userId,
        entityField,
        likeGivenField,
        likeReceivedField,
      );

      // ── Recent matches (last 5) for list ──
      const recentMatches = await this.getRecentMatches(
        userId,
        entityField,
        isEmployee,
      );

      return {
        totalLikesGiven,
        totalLikesReceived,
        totalMatches,
        matchRate,
        totalFavorites,
        weeklyActivity,
        recentMatches,
      };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while fetching analytics.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  private async getWeeklyActivity(
    userId: string,
    entityField: string,
    likeGivenField: string,
    likeReceivedField: string,
  ) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: {
      day: string;
      likes: number;
      received: number;
      matches: number;
    }[] = [];

    // Get date range for last 7 days
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const qb = this.jobMatchingRepo.createQueryBuilder('jm');

      // Count likes given, received, and matches for this day in a single query
      const counts = await qb
        .select([
          `SUM(CASE WHEN jm."${likeGivenField}" = true THEN 1 ELSE 0 END) as likes`,
          `SUM(CASE WHEN jm."${likeReceivedField}" = true THEN 1 ELSE 0 END) as received`,
          `SUM(CASE WHEN jm."isMatched" = true THEN 1 ELSE 0 END) as matches`,
        ])
        .where(`jm."${entityField}Id" = :userId`, { userId })
        .andWhere('jm."createdAt" >= :dayStart', { dayStart })
        .andWhere('jm."createdAt" < :dayEnd', { dayEnd })
        .getRawOne();

      result.push({
        day: days[dayStart.getDay()],
        likes: parseInt(counts?.likes || '0', 10),
        received: parseInt(counts?.received || '0', 10),
        matches: parseInt(counts?.matches || '0', 10),
      });
    }

    return result;
  }

  private async getRecentMatches(
    userId: string,
    entityField: string,
    isEmployee: boolean,
  ) {
    const relations = isEmployee ? ['company'] : ['employee'];

    const matches = await this.jobMatchingRepo.find({
      where: { [entityField]: { id: userId }, isMatched: true },
      relations,
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return matches.map((m) => {
      if (isEmployee) {
        return {
          id: m.id,
          name: m.company?.name || 'Unknown',
          avatar: m.company?.avatar || null,
          matchedAt: m.createdAt,
        };
      } else {
        return {
          id: m.id,
          name: m.employee?.username || m.employee?.firstname || 'Unknown',
          avatar: m.employee?.avatar || null,
          matchedAt: m.createdAt,
        };
      }
    });
  }

  async findCurrentCompanyMatchingCount(cid: string): Promise<any> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching-count',
      cid,
    );
    const cached = await this.redisService.get<{ totalMatching: number }>(
      cacheKey,
    );
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: { company: { id: cid }, isMatched: true },
      });
      const result = { totalMatching: count };
      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          'An error occurred while counting the current company matching.',
      );
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}
