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
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
  FindCurrentMatchingResponseDTO,
  MatchAnalyticsItemDTO,
  MatchCountResponseDTO,
  MatchDTO,
  MatchResponseDTO,
  MonthlyActivityItemDTO,
  WeeklyActivityItemDTO,
  EmployeeMatchingLookupDTO,
  CompanyMatchingLookupDTO,
  MatchingAnalyticsDTO,
  MatchingAnalyticsResponseDTO,
  FindCurrentLikeResponseDTO,
} from '@app/contracts/dtos/job';
import { IMatchingService } from '@app/contracts/interfaces/service/job-service.interface';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';

@Injectable()
export class MatchingService implements IMatchingService {
  private readonly openAI: OpenAI;

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
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

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
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-liked',
      employeeMatchingLookupDTO.eid,
    );
    const cached =
      await this.redisService.get<FindCurrentLikeResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const employeeLiked = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchingLookupDTO.eid },
          employeeLiked: true,
        },
        relations: ['company', 'company.openPositions'],
      });

      if (!employeeLiked)
        throw new RpcException({
          message: 'Employee Liked not found',
          statusCode: 404,
        });

      const result = employeeLiked.map(
        (e) => new FindCurrentLikeResponseDTO(e.company),
      );
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
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-liked',
      companyMatchingLookupDTO.cid,
    );
    const cached =
      await this.redisService.get<FindCurrentLikeResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const companyLiked = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchingLookupDTO.cid },
          companyLiked: true,
        },
        relations: ['employee', 'employee.skills'],
      });

      if (!companyLiked)
        throw new RpcException({
          message: 'Company Liked not found',
          statusCode: 404,
        });

      const result = companyLiked.map(
        (c) => new FindCurrentLikeResponseDTO(c.employee),
      );
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
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching',
      employeeMatchingLookupDTO.eid,
    );
    const cached =
      await this.redisService.get<FindCurrentMatchingResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentEmployeeMatching = await this.jobMatchingRepo.find({
        where: {
          employee: { id: employeeMatchingLookupDTO.eid },
          isMatched: true,
        },
        relations: ['company.openPositions'],
      });

      if (!currentEmployeeMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentEmployeeMatching.map((match) => {
        const dto = new FindCurrentMatchingResponseDTO(match.company as any);
        dto.skillScore = match.skillScore ?? null;
        return dto;
      });
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
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching',
      companyMatchingLookupDTO.cid,
    );
    const cached =
      await this.redisService.get<FindCurrentMatchingResponseDTO[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentCompanyMatching = await this.jobMatchingRepo.find({
        where: {
          company: { id: companyMatchingLookupDTO.cid },
          isMatched: true,
        },
        relations: ['employee.skills'],
      });

      if (!currentCompanyMatching)
        throw new RpcException({
          message: 'There is no matching.',
          statusCode: 404,
        });

      const result = currentCompanyMatching.map((match) => {
        const dto = new FindCurrentMatchingResponseDTO(match.employee as any);
        dto.skillScore = match.skillScore ?? null;
        return dto;
      });
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
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = this.redisService.generateMatchingKey(
      'employee-matching-count',
      employeeMatchingLookupDTO.eid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: {
          employee: { id: employeeMatchingLookupDTO.eid },
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

  async getMatchingAnalytics(
    matchingAnalyticsDTO: MatchingAnalyticsDTO,
  ): Promise<MatchingAnalyticsResponseDTO> {
    // No caching — dashboard should always show real-time data.
    try {
      const isEmployee = matchingAnalyticsDTO.role === 'employee';
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
            [entityField]: { id: matchingAnalyticsDTO.userId },
            [likeGivenField]: true,
          },
        }),
        this.jobMatchingRepo.count({
          where: {
            [entityField]: { id: matchingAnalyticsDTO.userId },
            [likeReceivedField]: true,
          },
        }),
        this.jobMatchingRepo.count({
          where: {
            [entityField]: { id: matchingAnalyticsDTO.userId },
            isMatched: true,
          },
        }),
        favoriteRepo.count({
          where: { [entityField]: { id: matchingAnalyticsDTO.userId } },
        }),
      ]);

      const matchRate =
        totalLikesGiven > 0
          ? Math.round((totalMatches / totalLikesGiven) * 100)
          : 0;

      // ── Weekly activity (last 7 days) and monthly activity (last 12 months) ──
      const [weeklyActivity, monthlyActivity] = await Promise.all([
        this.getWeeklyActivity(
          matchingAnalyticsDTO.userId,
          entityField,
          likeGivenField,
          likeReceivedField,
        ),
        this.getMonthlyActivity(
          matchingAnalyticsDTO.userId,
          entityField,
          likeGivenField,
          likeReceivedField,
        ),
      ]);

      // ── Recent matches (last 5) for list ──
      const recentMatches = await this.getRecentMatches(
        matchingAnalyticsDTO.userId,
        entityField,
        isEmployee,
      );

      return new MatchingAnalyticsResponseDTO({
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
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    const cacheKey = this.redisService.generateMatchingKey(
      'company-matching-count',
      companyMatchingLookupDTO.cid,
    );
    const cached = await this.redisService.get<MatchCountResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const count = await this.jobMatchingRepo.count({
        where: {
          company: { id: companyMatchingLookupDTO.cid },
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

  async getAiMatchExplanation(
    aiMatchExplanationDTO: AiMatchExplanationDTO,
  ): Promise<AiMatchExplanationResponseDTO> {
    const cacheKey = this.redisService.generateMatchingKey(
      `ai-explanation:${aiMatchExplanationDTO.eid}`,
      aiMatchExplanationDTO.cid,
    );
    const cached =
      await this.redisService.get<AiMatchExplanationResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: aiMatchExplanationDTO.eid },
          relations: ['skills', 'experiences', 'careerScopes', 'educations'],
        }),
        this.companyRepo.findOne({
          where: { id: aiMatchExplanationDTO.cid },
          relations: ['openPositions', 'benefits', 'values', 'careerScopes'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const employeeProfile = {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        availability: employee.availability,
        description: employee.description,
        location: employee.location,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map(
          (e) => `${e.degree} at ${e.school}`,
        ),
        experience: (employee.experiences ?? []).map((e) => e.title),
      };

      const companyProfile = {
        name: company.name,
        industry: company.industry,
        description: company.description,
        companySize: company.companySize,
        location: company.location,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: j.skillsRequired,
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      };

      const model = this.configService.get<string>('openai.model') ?? 'gpt-4o';
      const completion = await this.openAI.chat.completions.create({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a talent matching expert. Analyze the compatibility between a candidate and a company and return a JSON object with exactly these fields:
- "score": (number 0-100) overall compatibility score
- "verdict": (string) one-line verdict like "Strong Match", "Good Match", "Partial Match", or "Weak Match"
- "explanation": (string) 2-3 sentence explanation of the match
- "strengths": (string[]) 3-5 specific reasons why they are a good fit
- "gaps": (string[]) 2-3 areas where the candidate falls short or could improve
Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Analyze this match:\n\nCandidate:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const result = new AiMatchExplanationResponseDTO({
        score: parsed.score ?? 0,
        verdict: parsed.verdict ?? 'Unknown',
        explanation: parsed.explanation ?? '',
        strengths: parsed.strengths ?? [],
        gaps: parsed.gaps ?? [],
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'AI match explanation failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'AI match explanation failed',
      );
    }
  }

  async getAiMatchProfiles(
    aiMatchProfilesDTO: AiMatchProfilesDTO,
  ): Promise<AiMatchProfilesResponseDTO> {
    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: { id: aiMatchProfilesDTO.eid },
        relations: ['skills', 'experiences', 'careerScopes', 'educations'],
      }),
      this.companyRepo.findOne({
        where: { id: aiMatchProfilesDTO.cid },
        relations: ['openPositions', 'benefits', 'values', 'careerScopes'],
      }),
    ]);

    if (!employee || !company) {
      throw new RpcException({
        message: 'Employee or Company not found.',
        statusCode: 404,
      });
    }

    return {
      employeeProfile: {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        availability: employee.availability,
        description: employee.description,
        location: employee.location,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map(
          (e) => `${e.degree} at ${e.school}`,
        ),
        experience: (employee.experiences ?? []).map((e) => e.title),
      },
      companyProfile: {
        name: company.name,
        industry: company.industry,
        description: company.description,
        companySize: company.companySize,
        location: company.location,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: j.skillsRequired,
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      },
    };
  }

  async getAiInterviewPrep(
    aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO> {
    const titleSlug = aiInterviewPrepDTO.interviewTitle
      ? `:${aiInterviewPrepDTO.interviewTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`
      : '';
    const cacheKey = this.redisService.generateMatchingKey(
      `ai-interview-prep:${aiInterviewPrepDTO.eid}${titleSlug}`,
      aiInterviewPrepDTO.cid,
    );
    const cached =
      await this.redisService.get<AiInterviewPrepResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: aiInterviewPrepDTO.eid },
          relations: ['skills', 'experiences', 'careerScopes', 'educations'],
        }),
        this.companyRepo.findOne({
          where: { id: aiInterviewPrepDTO.cid },
          relations: ['openPositions', 'values', 'careerScopes'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const employeeProfile = {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        description: employee.description,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map((e) => ({
          degree: e.degree,
          school: e.school,
          year: e.year,
        })),
        experience: (employee.experiences ?? []).map((e) => ({
          title: e.title,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      };

      const companyProfile = {
        name: company.name,
        industry: company.industry,
        description: company.description,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: j.skillsRequired,
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        values: (company.values ?? []).map((v) => v.label),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      };

      const model = this.configService.get<string>('openai.model') ?? 'gpt-4o';
      const completion = await this.openAI.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert interview coach. Given a detailed candidate CV, a company profile${aiInterviewPrepDTO.interviewTitle ? `, and the specific interview round/type: "${aiInterviewPrepDTO.interviewTitle}"` : ''}, generate likely interview questions the candidate will face, each with a practical English answer tip AND a Khmer (ភាសាខ្មែរ) translation of both the question and the tip.
                      ${aiInterviewPrepDTO.interviewTitle ? `IMPORTANT: Tailor question categories and depth specifically for a "${aiInterviewPrepDTO.interviewTitle}" interview. For example, a Technical Round should heavily weight Technical questions; a Cultural/HR round should focus on Behavioral and Culture Fit; a General interview should be balanced.` : ''}

                      Return a JSON object with exactly this structure:
                      {
                        "questions": [
                          {
                            "question": "English question here",
                            "questionKm": "សំណួរជាភាសាខ្មែរ",
                            "category": "Technical",
                            "tip": "English answer tip here",
                            "tipKm": "គន្លឹះចម្លើយជាភាសាខ្មែរ"
                          },
                          ...
                        ]
                      }

                      Categories must be one of: "Technical", "Behavioral", "Culture Fit", "Situational".
                      Generate 12 to 15 questions — draw deeply from the candidate's specific work experience, education background, listed skills, and career scope. Make questions highly specific to their CV (reference actual job titles or skills they listed). Tips must be 1-2 sentences of concrete, actionable advice tailored to this candidate. Khmer translations must be natural and accurate. Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Candidate CV:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const questions = (parsed.questions ?? []).map((q: any) => ({
        question: q.question ?? '',
        questionKm: q.questionKm ?? '',
        category: q.category ?? 'General',
        tip: q.tip ?? '',
        tipKm: q.tipKm ?? '',
      }));
      const result = new AiInterviewPrepResponseDTO({ questions });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'AI interview prep failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'AI interview prep failed',
      );
    }
  }
}
