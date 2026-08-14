import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { EmailService } from '@app/common/email/email.service';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { MatchDTO, MatchResponseDTO } from '@app/contracts/dtos/job';
import { IMatchingService } from '@app/contracts/interfaces/service/job-service.interface';
import { computeSkillScore } from '../utils/matching-score.util';
import {
  UnMatchDTO,
  UnMatchResposneDTO,
} from '@app/contracts/dtos/job/matching/unmatch.dto';
import {
  generateCompanyFavoriteCountKey,
  generateCompanyFavoritesKey,
  generateEmployeeFavoriteCountKey,
  generateEmployeeFavoritesKey,
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
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
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

      const skillScore = computeSkillScore(employee, company);

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
      });

      if (!match) {
        throw new RpcException({
          message: 'Match not found.',
          statusCode: 404,
        });
      }

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

      const skillScore = computeSkillScore(employee, company);

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
