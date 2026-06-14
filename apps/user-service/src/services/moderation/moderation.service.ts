import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { User } from '@app/common/database/entities/user.entity';
import { CHAT } from '@app/contracts/constants/domain/chat.constant';
import {
  BlockActionResponseDTO,
  BlockedUserResponseDTO,
  BlockStatusResponseDTO,
  BlockUserDTO,
  GetBlockStatusDTO,
  ListBlockedUsersDTO,
  ReportUserDTO,
  ReportUserResponseDTO,
  UnblockUserDTO,
} from '@app/contracts/dtos/user';
import { IModerationService } from '@app/contracts/interfaces/service/user-service.interface';
import { resolveUserId } from '@app/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class ModerationService implements IModerationService {
  constructor(
    @InjectRepository(UserBlock)
    private readonly blockRepo: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private readonly reportRepo: Repository<UserReport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ModerationService.name);
  }

  /**
   * Normalise any incoming id (User / Employee / Company UUID) to a User.id so
   * blocks line up with how chat-service resolves participants.
   */
  private async resolve(id: string): Promise<string> {
    return resolveUserId(this.userRepo, id);
  }

  /**
   * Resolve a user's display name (employee first/last or company name).
   */
  private resolveName(user: User): string {
    if (user.employee) {
      return (
        [user.employee.firstname, user.employee.lastname]
          .filter(Boolean)
          .join(' ') || 'Unknown'
      );
    }
    return user.company?.name || 'Unknown';
  }

  /**
   * Resolve a user's avatar (employee avatar or company avatar).
   */
  private resolveAvatar(user: User): string | null {
    return user.employee?.avatar || user.company?.avatar || null;
  }

  /**
   * Block a user (mutual invisibility).
   */
  async blockUser(blockUserDTO: BlockUserDTO): Promise<BlockActionResponseDTO> {
    try {
      const blockerId = await this.resolve(blockUserDTO.blockerId);
      const blockedId = await this.resolve(blockUserDTO.blockedId).catch(() => {
        throw new RpcException({
          statusCode: 404,
          message: 'The user you are trying to block does not exist.',
        });
      });

      if (blockerId === blockedId) {
        throw new RpcException({
          statusCode: 400,
          message: 'You cannot block yourself.',
        });
      }

      const existing = await this.blockRepo.findOne({
        where: { blocker: { id: blockerId }, blocked: { id: blockedId } },
      });
      if (!existing) {
        await this.blockRepo.save(
          this.blockRepo.create({
            blocker: { id: blockerId } as User,
            blocked: { id: blockedId } as User,
          }),
        );
      }

      return new BlockActionResponseDTO({
        message: 'User blocked successfully.',
        blocked: true,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error((error as Error).message || 'Failed to block user.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while blocking the user.',
      });
    }
  }

  async unblockUser(
    unblockUserDTO: UnblockUserDTO,
  ): Promise<BlockActionResponseDTO> {
    try {
      const blockerId = await this.resolve(unblockUserDTO.blockerId);
      const blockedId = await this.resolve(unblockUserDTO.blockedId);
      await this.blockRepo.delete({
        blocker: { id: blockerId },
        blocked: { id: blockedId },
      });

      return new BlockActionResponseDTO({
        message: 'User unblocked successfully.',
        blocked: false,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Failed to unblock user.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while unblocking the user.',
      });
    }
  }

  async listBlockedUsers(
    listBlockedUsersDTO: ListBlockedUsersDTO,
  ): Promise<BlockedUserResponseDTO[]> {
    try {
      const blockerId = await this.resolve(listBlockedUsersDTO.blockerId);
      const blocks = await this.blockRepo.find({
        where: { blocker: { id: blockerId } },
        relations: ['blocked', 'blocked.employee', 'blocked.company'],
        order: { createdAt: 'DESC' },
      });

      return blocks
        .filter((b) => b.blocked)
        .map(
          (b) =>
            new BlockedUserResponseDTO({
              id: b.blocked.id,
              employeeId: b.blocked.employee?.id ?? null,
              companyId: b.blocked.company?.id ?? null,
              name: this.resolveName(b.blocked),
              avatar: this.resolveAvatar(b.blocked) ?? CHAT.DEFAULT_AVATAR_PATH,
              role: b.blocked.role,
              blockedAt: b.createdAt,
            }),
        );
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Failed to list blocked users.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while loading blocked users.',
      });
    }
  }

  async getBlockStatus(
    getBlockStatusDTO: GetBlockStatusDTO,
  ): Promise<BlockStatusResponseDTO> {
    try {
      const userId = await this.resolve(getBlockStatusDTO.userId);
      const otherUserId = await this.resolve(getBlockStatusDTO.otherUserId);
      const [blockedByMe, blockedMe] = await Promise.all([
        this.blockRepo.exists({
          where: { blocker: { id: userId }, blocked: { id: otherUserId } },
        }),
        this.blockRepo.exists({
          where: { blocker: { id: otherUserId }, blocked: { id: userId } },
        }),
      ]);

      return new BlockStatusResponseDTO({
        isBlocked: blockedByMe || blockedMe,
        blockedByMe,
        blockedMe,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'Failed to get block status.',
      );
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while checking block status.',
      });
    }
  }

  async reportUser(
    reportUserDTO: ReportUserDTO,
  ): Promise<ReportUserResponseDTO> {
    const { reason, details } = reportUserDTO;

    try {
      const reporterId = await this.resolve(reportUserDTO.reporterId);
      const reportedId = await this.resolve(reportUserDTO.reportedId).catch(
        () => {
          throw new RpcException({
            statusCode: 404,
            message: 'The user you are trying to report does not exist.',
          });
        },
      );

      if (reporterId === reportedId) {
        throw new RpcException({
          statusCode: 400,
          message: 'You cannot report yourself.',
        });
      }

      const saved = await this.reportRepo.save(
        this.reportRepo.create({
          reporter: { id: reporterId } as User,
          reported: { id: reportedId } as User,
          reason,
          details: details ?? null,
        }),
      );

      return new ReportUserResponseDTO({
        message:
          'Thanks for the report. Our team will review it as soon as possible.',
        reportId: saved.id,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error((error as Error).message || 'Failed to report user.');
      throw new RpcException({
        statusCode: 500,
        message: 'An error occurred while submitting the report.',
      });
    }
  }
}
