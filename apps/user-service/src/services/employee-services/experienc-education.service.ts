import { Education } from '@app/common/database/entities/employee/education.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

@Injectable()
export class ExperienceAndEducationService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Experience)
    private readonly expRepository: Repository<Experience>,
    @InjectRepository(Education)
    private readonly eduRepository: Repository<Education>,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

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
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

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

      // Invalidate cache after deletion
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      await this.eduRepository.delete(educationId);

      return {
        message: `${removeEdu.school} education was removed successfully`,
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
