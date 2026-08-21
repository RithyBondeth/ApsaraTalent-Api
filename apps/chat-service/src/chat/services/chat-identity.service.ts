import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import {
  isUuid as isUuidValue,
  resolveUserId as resolveUserIdFor,
  resolveUserIdSafe as resolveUserIdSafeFor,
} from '@app/common';

/**
 * Identity resolution and block checks for chat.
 *
 * Both the message-writing and chat-reading services need to turn an Employee,
 * Company or User id into a canonical User.id, and to honour blocks. Keeping
 * that here means neither service depends on the other.
 */
@Injectable()
export class ChatIdentityService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly blockRepository: Repository<UserBlock>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ChatIdentityService.name);
  }

  /**
   * Throws if either user has blocked the other — used to gate chat creation
   * and message sending in both directions.
   */
  async assertNotBlocked(userIdA: string, userIdB: string): Promise<void> {
    const blocked = await this.blockRepository.exists({
      where: [
        { blocker: { id: userIdA }, blocked: { id: userIdB } },
        { blocker: { id: userIdB }, blocked: { id: userIdA } },
      ],
    });
    if (blocked) {
      throw new RpcException({
        statusCode: 403,
        message: 'You can no longer message this user.',
      });
    }
  }

  /**
   * Resolves the User.id from any combination of:
   *  - a raw User UUID
   *  - an Employee UUID (looks up via employee join)
   *  - a Company UUID  (looks up via company join)
   */
  async resolveUserId(id: string): Promise<string> {
    try {
      this.logger.debug(`Resolving ID: ${id}`);
      return await resolveUserIdFor(this.userRepository, id);
    } catch {
      throw new RpcException({
        message: `Could not resolve user ID from: ${id}`,
        statusCode: 404,
      });
    }
  }

  isUuid(value: string): boolean {
    return isUuidValue(value);
  }

  async resolveUserIdSafe(id: string): Promise<string | null> {
    const result = await resolveUserIdSafeFor(this.userRepository, id);
    if (!result) {
      this.logger.warn(`resolveUserIdSafe failed for "${id}"`);
    }
    return result;
  }
}
