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
import { UserResponseDTO } from '@app/contracts/dtos/user';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  AnalyticsResponseDTO,
  CompanyMatchLookupDTO,
  EmployeeMatchLookupDTO,
  MatchAnalyticsItemDTO,
  MatchAnalyticsDTO,
  MatchCountResponseDTO,
  MatchDTO,
  MatchResponseDTO,
  MonthlyActivityItemDTO,
  WeeklyActivityItemDTO,
} from '@app/contracts/dtos/job';

import { IMatchingService } from '@app/contracts/interfaces/service/job-service.interface';
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

  async employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO> {
    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: matchDTO.eid },
          relations: ['user', 'skills'],
        }),
        this.companyRepo.findOne({
          where: { id: matchDTO.cid },
          relations: ['user', 'openPositions'],
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
          employee: { id: matchDTO.eid },
          company: { id: matchDTO.cid },
        },
        relations: ['employee', 'company'],
      });

      const skillScore = this.computeSkillScore(employee, company);

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: true,
          companyLiked: false,
          isMatched: false,
          skillScore,
        });
      } else {
        match.employeeLiked = true;
        match.skillScore = skillScore;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      // Tinder-style: remove from employee's saved companies when liked
      await this.employeeFavoriteCompanyRepo.delete({
        employee: { id: matchDTO.eid },
        company: { id: matchDTO.cid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDTO.eid, matchDTO.cid),
        this.redisService.del(
          this.redisService.generateEmployeeFavoritesKey(matchDTO.eid),
        ),
        this.redisService.del(
          this.redisService.generateEmployeeFavoriteCountKey(matchDTO.eid),
        ),
      ]);

      // Notify about the like/match
      const companyUserId = company.user?.id;
      const employeeUserId = employee.user?.id;
      const notificationTargets: string[] = [];

      if (becameMatched) {
        const matchData = { employeeId: matchDTO.eid, companyId: matchDTO.cid };
        const employeeName = employee.username || employee.firstname;
        if (companyUserId) {
          this.notificationClient.emit(
            NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
            {
              userId: companyUserId,
              title: "It's a Match!",
              message: `${employeeName} and your company liked each other!`,
              type: 'match',
              data: {
                ...matchData,
                senderName: employeeName,
                senderAvatar: employee.avatar || null,
                eventType: 'match',
              },
              sendPush: true,
              senderAvatar: employee.avatar || null,
            },
          );
          notificationTargets.push(companyUserId);
        }
        if (employeeUserId) {
          this.notificationClient.emit(
            NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
            {
              userId: employeeUserId,
              title: "It's a Match!",
              message: `You and ${company.name} liked each other!`,
              type: 'match',
              data: {
                ...matchData,
                senderName: company.name,
                senderAvatar: company.avatar || null,
                eventType: 'match',
              },
              sendPush: true,
              senderAvatar: company.avatar || null,
            },
          );
          notificationTargets.push(employeeUserId);
        }
      } else if (companyUserId) {
        const employeeName = employee.username || employee.firstname;
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: companyUserId,
            title: 'New Like',
            message: `${employeeName} liked your company!`,
            type: 'like',
            data: {
              employeeId: matchDTO.eid,
              companyId: matchDTO.cid,
              senderName: employeeName,
              senderAvatar: employee.avatar || null,
              eventType: 'like',
            },
            sendPush: true,
            senderAvatar: employee.avatar || null,
          },
        );
        notificationTargets.push(companyUserId);
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

      return new MatchResponseDTO({ ...saved, notificationTargets });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO> {
    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: matchDTO.eid },
          relations: ['user', 'skills'],
        }),
        this.companyRepo.findOne({
          where: { id: matchDTO.cid },
          relations: ['user', 'openPositions'],
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
          employee: { id: matchDTO.eid },
          company: { id: matchDTO.cid },
        },
        relations: ['employee', 'company'],
      });

      const skillScore = this.computeSkillScore(employee, company);

      if (!match) {
        match = this.jobMatchingRepo.create({
          employee,
          company,
          employeeLiked: false,
          companyLiked: true,
          isMatched: false,
          skillScore,
        });
      } else {
        match.companyLiked = true;
        match.skillScore = skillScore;
      }

      const becameMatched =
        !match.isMatched && match.employeeLiked && match.companyLiked;
      if (becameMatched) {
        match.isMatched = true;
      }

      const saved = await this.jobMatchingRepo.save(match);

      // Tinder-style: remove from company's saved employees when liked
      await this.companyFavoriteEmployeeRepo.delete({
        company: { id: matchDTO.cid },
        employee: { id: matchDTO.eid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDTO.eid, matchDTO.cid),
        this.redisService.del(
          this.redisService.generateCompanyFavoritesKey(matchDTO.cid),
        ),
        this.redisService.del(
          this.redisService.generateCompanyFavoriteCountKey(matchDTO.cid),
        ),
      ]);

      // Notify about the like/match
      const employeeUserId = employee.user?.id;
      const companyUserId = company.user?.id;
      const notificationTargets: string[] = [];

      if (becameMatched) {
        const matchData = { employeeId: matchDTO.eid, companyId: matchDTO.cid };
        const employeeName = employee.username || employee.firstname;
        if (employeeUserId) {
          this.notificationClient.emit(
            NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
            {
              userId: employeeUserId,
              title: "It's a Match!",
              message: `${company.name} and you liked each other!`,
              type: 'match',
              data: {
                ...matchData,
                senderName: company.name,
                senderAvatar: company.avatar || null,
                eventType: 'match',
              },
              sendPush: true,
              senderAvatar: company.avatar || null,
            },
          );
          notificationTargets.push(employeeUserId);
        }
        if (companyUserId) {
          this.notificationClient.emit(
            NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
            {
              userId: companyUserId,
              title: "It's a Match!",
              message: `You and ${employeeName} liked each other!`,
              type: 'match',
              data: {
                ...matchData,
                senderName: employeeName,
                senderAvatar: employee.avatar || null,
                eventType: 'match',
              },
              sendPush: true,
              senderAvatar: employee.avatar || null,
            },
          );
          notificationTargets.push(companyUserId);
        }
      } else if (employeeUserId) {
        this.notificationClient.emit(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: employeeUserId,
            title: 'New Like',
            message: `${company.name} liked your profile!`,
            type: 'like',
            data: {
              employeeId: matchDTO.eid,
              companyId: matchDTO.cid,
              senderName: company.name,
              senderAvatar: company.avatar || null,
              eventType: 'like',
            },
            sendPush: true,
            senderAvatar: company.avatar || null,
          },
        );
        notificationTargets.push(employeeUserId);
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

      return new MatchResponseDTO({ ...saved, notificationTargets });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async findCurrentEmployeeLiked(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-liked',
      employeeMatchLookupDTO.eid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const employeeLiked = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchLookupDTO.eid },
          employeeLiked: true,
        },
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

  async findCurrentCompanyLiked(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-liked',
      companyMatchLookupDTO.cid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const companyLiked = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchLookupDTO.cid },
          companyLiked: true,
        },
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

  async findCurrentEmployeeMatching(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching',
      employeeMatchLookupDTO.eid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentEmployeeMatching = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchLookupDTO.eid },
          isMatched: true,
        },
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

  async findCurrentCompanyMatching(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<UserResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching',
      companyMatchLookupDTO.cid,
    );
    const cached = await this.redisService.get<UserResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentCompanyMatching = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchLookupDTO.cid },
          isMatched: true,
        },
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

  async findCurrentEmployeeMatchingCount(
    employeeMatchLookupDTO: EmployeeMatchLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching-count',
      employeeMatchLookupDTO.eid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: {
          employee: { id: employeeMatchLookupDTO.eid },
          isMatched: true,
        },
      });
      const result = new MatchCountResponseDTO({ count });
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

  async getAnalytics(
    matchAnalyticsDTO: MatchAnalyticsDTO,
  ): Promise<AnalyticsResponseDTO> {
    // No caching — dashboard should always show real-time data.
    try {
      const isEmployee = matchAnalyticsDTO.role === 'employee';
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
          where: {
            [entityField]: { id: matchAnalyticsDTO.userId },
            [likeGivenField]: true,
          },
        }),
        this.jobMatchingRepo.count({
          where: {
            [entityField]: { id: matchAnalyticsDTO.userId },
            [likeReceivedField]: true,
          },
        }),
        this.jobMatchingRepo.count({
          where: {
            [entityField]: { id: matchAnalyticsDTO.userId },
            isMatched: true,
          },
        }),
        favoriteRepo.count({
          where: { [entityField]: { id: matchAnalyticsDTO.userId } },
        }),
      ]);

      const matchRate =
        totalLikesGiven > 0
          ? Math.round((totalMatches / totalLikesGiven) * 100)
          : 0;

      // ── Weekly activity (last 7 days) and monthly activity (last 12 months) ──
      const [weeklyActivity, monthlyActivity] = await Promise.all([
        this.getWeeklyActivity(
          matchAnalyticsDTO.userId,
          entityField,
          likeGivenField,
          likeReceivedField,
        ),
        this.getMonthlyActivity(
          matchAnalyticsDTO.userId,
          entityField,
          likeGivenField,
          likeReceivedField,
        ),
      ]);

      // ── Recent matches (last 5) for list ──
      const recentMatches = await this.getRecentMatches(
        matchAnalyticsDTO.userId,
        entityField,
        isEmployee,
      );

      return new AnalyticsResponseDTO({
        totalLikesGiven,
        totalLikesReceived,
        totalMatches,
        matchRate,
        totalFavorites,
        weeklyActivity,
        monthlyActivity,
        recentMatches,
      });
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
  ): Promise<WeeklyActivityItemDTO[]> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: WeeklyActivityItemDTO[] = [];

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

    return result.map((r) => new WeeklyActivityItemDTO(r));
  }

  private async getMonthlyActivity(
    userId: string,
    entityField: string,
    likeGivenField: string,
    likeReceivedField: string,
  ): Promise<MonthlyActivityItemDTO[]> {
    const now = new Date();
    const startOfWindow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );

    const rows: {
      month: string;
      likes: string;
      received: string;
      matches: string;
    }[] = await this.jobMatchingRepo
      .createQueryBuilder('jm')
      .select([
        `TO_CHAR(DATE_TRUNC('month', jm."createdAt"), 'YYYY-MM') as month`,
        `SUM(CASE WHEN jm."${likeGivenField}" = true THEN 1 ELSE 0 END) as likes`,
        `SUM(CASE WHEN jm."${likeReceivedField}" = true THEN 1 ELSE 0 END) as received`,
        `SUM(CASE WHEN jm."isMatched" = true THEN 1 ELSE 0 END) as matches`,
      ])
      .where(`jm."${entityField}Id" = :userId`, { userId })
      .andWhere('jm."createdAt" >= :startOfWindow', { startOfWindow })
      .groupBy(`DATE_TRUNC('month', jm."createdAt")`)
      .orderBy(`DATE_TRUNC('month', jm."createdAt")`, 'ASC')
      .getRawMany();

    // Build a full 12-month map so months with zero activity are included
    const dataMap = new Map(rows.map((r) => [r.month, r]));
    const result: MonthlyActivityItemDTO[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const row = dataMap.get(label);
      result.push(
        new MonthlyActivityItemDTO({
          month: label,
          likes: parseInt(row?.likes ?? '0', 10),
          received: parseInt(row?.received ?? '0', 10),
          matches: parseInt(row?.matches ?? '0', 10),
        }),
      );
    }

    return result;
  }

  private async getRecentMatches(
    userId: string,
    entityField: string,
    isEmployee: boolean,
  ): Promise<MatchAnalyticsItemDTO[]> {
    const relations = isEmployee ? ['company'] : ['employee'];

    const matches = await this.jobMatchingRepo.find({
      where: { [entityField]: { id: userId }, isMatched: true },
      relations,
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return matches.map((m) => {
      if (isEmployee) {
        return new MatchAnalyticsItemDTO({
          id: m.id,
          name: m.company?.name || 'Unknown',
          avatar: m.company?.avatar || null,
          matchedAt: m.createdAt,
        });
      } else {
        return new MatchAnalyticsItemDTO({
          id: m.id,
          name: m.employee?.username || m.employee?.firstname || 'Unknown',
          avatar: m.employee?.avatar || null,
          matchedAt: m.createdAt,
        });
      }
    });
  }

  private computeSkillScore(
    employee: Employee,
    company: Company,
  ): number | null {
    const employeeSkills = (employee.skills ?? []).map((s) =>
      s.name.toLowerCase().trim(),
    );
    if (!employeeSkills.length) return null;

    const jobs = company.openPositions ?? [];
    if (!jobs.length) return null;

    let bestScore = 0;
    for (const job of jobs) {
      if (!job.skillsRequired) continue;
      const required = job.skillsRequired
        .split(',')
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);
      if (!required.length) continue;
      const matched = required.filter((r) => employeeSkills.includes(r)).length;
      const score = matched / required.length;
      if (score > bestScore) bestScore = score;
    }

    return Math.round(bestScore * 100);
  }

  async findCurrentCompanyMatchingCount(
    companyMatchLookupDTO: CompanyMatchLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching-count',
      companyMatchLookupDTO.cid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: {
          company: { id: companyMatchLookupDTO.cid },
          isMatched: true,
        },
      });
      const result = new MatchCountResponseDTO({ count });
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
