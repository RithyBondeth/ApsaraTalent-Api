import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { EmailService } from '@app/common/email/email.service';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { MatchLinkService } from './match-link.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import {
  MatchCountResponseDTO,
  MatchDTO,
  MatchResponseDTO,
  EmployeeMatchingLookupDTO,
  CompanyMatchingLookupDTO,
} from '@app/contracts/dtos/job';
import { IMatchingService } from '@app/contracts/interfaces/service/job-service.interface';
import {
  UnMatchDTO,
  UnMatchResposneDTO,
} from '@app/contracts/dtos/job/matching/unmatch.dto';
import {
  generateCompanyFavoriteCountKey,
  generateCompanyFavoritesKey,
  generateEmployeeFavoriteCountKey,
  generateEmployeeFavoritesKey,
  generateMatchingKey,
} from '@app/common/redis/redis-keys.util';

/**
 * The matching lifecycle itself: likes from either side, the mutual match they
 * produce, unmatching, and the resulting lists and counts. Analytics and AI
 * narration live in MatchingAnalyticsService and MatchingAiService.
 */
@Injectable()
export class MatchingService implements IMatchingService {
  constructor(
    @InjectRepository(JobMatching)
    private readonly jobMatchingRepo: Repository<JobMatching>,
    @InjectRepository(EmployeeFavoriteCompany)
    private readonly employeeFavoriteCompanyRepo: Repository<EmployeeFavoriteCompany>,
    @InjectRepository(CompanyFavoriteEmployee)
    private readonly companyFavoriteEmployeeRepo: Repository<CompanyFavoriteEmployee>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly matchLink: MatchLinkService,
  ) {}

  async employeeLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO> {
    try {
      const {
        match: saved,
        becameMatched,
        employee,
        company,
      } = await this.matchLink.recordInterest(
        matchDTO.eid,
        matchDTO.cid,
        'employee',
      );

      // Tinder-style: remove from employee's saved companies when liked
      await this.employeeFavoriteCompanyRepo.delete({
        employee: { id: matchDTO.eid },
        company: { id: matchDTO.cid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDTO.eid, matchDTO.cid),
        this.redisService.del(generateEmployeeFavoritesKey(matchDTO.eid)),
        this.redisService.del(generateEmployeeFavoriteCountKey(matchDTO.eid)),
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

      if (becameMatched && company.user?.email && employee.user?.email) {
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
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }

  async unmatch(unMatchDTO: UnMatchDTO): Promise<UnMatchResposneDTO> {
    try {
      const match = await this.jobMatchingRepo.findOne({
        where: {
          employee: { id: unMatchDTO.eid },
          company: { id: unMatchDTO.cid },
        },
        // Auth user IDs are needed for the socket broadcast — see notifyUserIds
        // on UnMatchResposneDTO. Loaded here, before the delete below.
        relations: ['employee', 'employee.user', 'company', 'company.user'],
      });

      if (!match) {
        throw new RpcException({
          message: 'Match not found.',
          statusCode: 404,
        });
      }

      const notifyUserIds = [
        match.employee?.user?.id,
        match.company?.user?.id,
      ].filter((userId): userId is string => !!userId);

      // Delete the match record and all interviews between these two parties
      await Promise.all([
        this.jobMatchingRepo.delete({ id: match.id }),
        this.interviewRepo.delete({
          employee: { id: unMatchDTO.eid },
          company: { id: unMatchDTO.cid },
        }),
      ]);

      // Invalidate matching caches for both sides so lists refresh immediately
      await this.redisService.invalidateMatchingCaches(
        unMatchDTO.eid,
        unMatchDTO.cid,
      );

      return new UnMatchResposneDTO({
        message: 'Unmatched successfully.',
        success: true,
        notifyUserIds,
      });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: error?.message || 'An error occurred while unmatching.',
        statusCode: error?.statusCode || 500,
      });
    }
  }

  /*
    Marking seen is a write, so it lives here rather than in the query service.
    Both sides share one implementation: the only differences are which column
    is stamped, which side the rows are filtered by, and which cache key drops.
  */
  private async markMatchingSeen(
    side: 'employee' | 'company',
    profileId: string,
  ): Promise<MatchCountResponseDTO> {
    try {
      /*
        Spelled out per side rather than indexed by a computed key: a dynamic
        column name has to be cast away to satisfy FindOptionsWhere, and a typo
        in it would silently match nothing instead of failing to compile.
      */
      const matchedRows: FindOptionsWhere<JobMatching> =
        side === 'employee'
          ? { employee: { id: profileId }, isMatched: true }
          : { company: { id: profileId }, isMatched: true };

      const unseenRows: FindOptionsWhere<JobMatching> =
        side === 'employee'
          ? { ...matchedRows, employeeSeenAt: IsNull() }
          : { ...matchedRows, companySeenAt: IsNull() };

      // Only the rows still null are written, so re-opening the page does not
      // churn timestamps that are already set.
      const seenNow =
        side === 'employee'
          ? { employeeSeenAt: new Date() }
          : { companySeenAt: new Date() };

      await this.jobMatchingRepo.update(unseenRows, seenNow);

      await this.redisService.del(
        generateMatchingKey(`${side}-matching-count-v2`, profileId),
      );

      /*
        Recount instead of assuming zero. The update above is the only writer of
        this column, but returning a measured number keeps the client free of
        any inference about what the badge should now be.
      */
      const [count, unseenCount] = await Promise.all([
        this.jobMatchingRepo.count({ where: matchedRows }),
        this.jobMatchingRepo.count({ where: unseenRows }),
      ]);
      return new MatchCountResponseDTO({ count, unseenCount });
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new RpcException({
        message:
          error?.message || 'An error occurred while marking matches as seen.',
        statusCode: error?.statusCode || 500,
      });
    }
  }

  async markEmployeeMatchingSeen(
    employeeMatchingLookupDTO: EmployeeMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.markMatchingSeen('employee', employeeMatchingLookupDTO.eid);
  }

  async markCompanyMatchingSeen(
    companyMatchingLookupDTO: CompanyMatchingLookupDTO,
  ): Promise<MatchCountResponseDTO> {
    return this.markMatchingSeen('company', companyMatchingLookupDTO.cid);
  }

  async companyLikes(matchDTO: MatchDTO): Promise<MatchResponseDTO> {
    try {
      const {
        match: saved,
        becameMatched,
        employee,
        company,
      } = await this.matchLink.recordInterest(
        matchDTO.eid,
        matchDTO.cid,
        'company',
      );

      // Tinder-style: remove from company's saved employees when liked
      await this.companyFavoriteEmployeeRepo.delete({
        company: { id: matchDTO.cid },
        employee: { id: matchDTO.eid },
      });

      // Invalidate matching + favorites caches for both sides
      await Promise.all([
        this.redisService.invalidateMatchingCaches(matchDTO.eid, matchDTO.cid),
        this.redisService.del(generateCompanyFavoritesKey(matchDTO.cid)),
        this.redisService.del(generateCompanyFavoriteCountKey(matchDTO.cid)),
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

      if (becameMatched && employee.user?.email && company.user?.email) {
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
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: error?.message || 'An error occurred while liking.',
        statusCode: 500,
      });
    }
  }
}
