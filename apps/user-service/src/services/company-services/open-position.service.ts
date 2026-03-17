import { Job } from '@app/common/database/entities/company/job.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class OpenPositionService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateCompanyCaches(companyId: string) {
    const users = await this.userRepository.find({
      where: { company: { id: companyId } },
      select: ['id'],
    });

    const keysToDelete = users.map((u) =>
      this.redisService.generateUserKey('detail', u.id),
    );

    // If you cache user list
    keysToDelete.push(this.redisService.generateListKey('user', {}));

    await Promise.all(keysToDelete.map((k) => this.redisService.del(k)));

    this.logger.info(
      { companyId, keysToDelete },
      'Company caches invalidated after removing open position',
    );
  }

  async removeOpenPosition(companyId: string, opId: string): Promise<any> {
    try {
      const removedJob = await this.jobRepository.findOne({
        where: { id: opId, company: { id: companyId } },
        relations: ['company'],
      });

      if (!removedJob)
        throw new RpcException({
          statusCode: 404,
          message: "There's no open position with this id.",
        });

      await this.jobRepository.delete(opId);

      // Invalidate cache after deletion
      await this.invalidateCompanyCaches(companyId);

      return {
        message: `${removedJob.title} position was removed successfully.`,
      };
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the company's open positions.",
      );
      throw new RpcException({
        message:
          "An error occurred while removing the company's open positions.",
        statusCode: 500,
      });
    }
  }
}
