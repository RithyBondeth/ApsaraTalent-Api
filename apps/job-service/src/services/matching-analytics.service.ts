import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  MatchAnalyticsItemDTO,
  MonthlyActivityItemDTO,
  WeeklyActivityItemDTO,
  MatchingAnalyticsDTO,
  MatchingAnalyticsResponseDTO,
} from '@app/contracts/dtos/job';
import { IMatchingAnalyticsService } from '@app/contracts/interfaces/service/job-service.interface';

/**
 * Aggregate match statistics for the company dashboard. Read-only and
 * cache-free — these are periodic dashboard reads, not hot-path lookups.
 * Split out of MatchingService (1,229 lines across three concerns).
 */
@Injectable()
export class MatchingAnalyticsService implements IMatchingAnalyticsService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly employeeFavoriteCompanyRepo: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly companyFavoriteEmployeeRepo: Repository<CompanyFavoriteEmployee>,
    private readonly logger: Logger,
  ) {}

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

    const now = new Date();
    // Inclusive 7-day window starting at 00:00 UTC six days ago.
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
    );

    // One grouped query instead of seven day-by-day round-trips to the DB.
    const rows: {
      day: string;
      likes: string;
      received: string;
      matches: string;
    }[] = await this.jobMatchingRepo
      .createQueryBuilder('jm')
      .select([
        `TO_CHAR(DATE_TRUNC('day', jm."createdAt"), 'YYYY-MM-DD') as day`,
        `SUM(CASE WHEN jm."${likeGivenField}" = true THEN 1 ELSE 0 END) as likes`,
        `SUM(CASE WHEN jm."${likeReceivedField}" = true THEN 1 ELSE 0 END) as received`,
        `SUM(CASE WHEN jm."isMatched" = true THEN 1 ELSE 0 END) as matches`,
      ])
      .where(`jm."${entityField}Id" = :userId`, { userId })
      .andWhere('jm."createdAt" >= :windowStart', { windowStart })
      .groupBy(`DATE_TRUNC('day', jm."createdAt")`)
      .getRawMany();

    // Build a full 7-day map so days with zero activity are still included.
    const dataMap = new Map(rows.map((r) => [r.day, r]));
    const result: WeeklyActivityItemDTO[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
      );
      const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const row = dataMap.get(label);
      result.push(
        new WeeklyActivityItemDTO({
          day: days[d.getUTCDay()],
          likes: parseInt(row?.likes ?? '0', 10),
          received: parseInt(row?.received ?? '0', 10),
          matches: parseInt(row?.matches ?? '0', 10),
        }),
      );
    }

    return result;
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
}
