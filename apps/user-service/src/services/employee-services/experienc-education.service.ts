import { Education } from '@app/common/database/entities/employee/education.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class ExperienceAndEducationService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Experience)
    private readonly expRepository: Repository<Experience>,
    @InjectRepository(Education)
    private readonly eduRepository: Repository<Education>,
    private readonly redisService: RedisService,
  ) {}

  private async invalidateEmployeeCaches(employeeId: string, keyword: string) {
    const users = await this.userRepository.find({
      where: { employee: { id: employeeId } },
      select: ['id'],
    });

    const keysToDelete = users.map((u) =>
      this.redisService.generateUserKey('detail', u.id),
    );

    // If you cache user list
    keysToDelete.push(this.redisService.generateListKey('user', {}));

    await Promise.all(keysToDelete.map((k) => this.redisService.del(k)));

    this.logger.info(
      { employeeId, keysToDelete },
      `Employee caches invalidated after removing ${keyword}`,
    );
  }

  async removeEmployeeExperience(employeeId: string, experienceId: string) {
    try {
      const removeExp = await this.expRepository.findOne({
        where: { id: experienceId, employee: { id: employeeId } },
        relations: ['employee'],
      });

      if (!removeExp)
        throw new RpcException({
          statusCode: 404,
          message: "There's no experience with this id.",
        });

      // Invalidate cache after deletion
      await this.invalidateEmployeeCaches(employeeId, 'experience');

      await this.expRepository.delete(experienceId);

      return {
        message: `${removeExp.title} experience was removed successfully.`,
      };
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's experience.",
      );
      throw new RpcException({
        message: "An error occurred while removing the employee's experience.",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeEducation(employeeId: string, educationId: string) {
    try {
      const removeEdu = await this.eduRepository.findOne({
        where: { id: educationId, employee: { id: employeeId } },
        relations: ['employee'],
      });

      if (!removeEdu)
        throw new RpcException({
          statusCode: 404,
          message: "There's no education with this id.",
        });

      await this.eduRepository.delete(educationId);

      // Invalidate cache after deletion
      await this.invalidateEmployeeCaches(employeeId, 'education');

      return {
        message: `${removeEdu.school} education was removed successfully.`,
      };
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's education.",
      );
      throw new RpcException({
        message: "An error occurred while removing the employee's education.",
        statusCode: 500,
      });
    }
  }
}
