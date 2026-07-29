import { Education } from '@app/common/database/entities/employee/education.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  RemoveEmployeeEducationDTO,
  RemoveEmployeeEducationResponseDTO,
  RemoveEmployeeExperienceDTO,
  RemoveEmployeeExperienceResponseDTO,
} from '@app/contracts/dtos/user';
import { IExperienceAndEducationService } from '@app/contracts/interfaces/service/user-service.interface';

@Injectable()
export class ExperienceAndEducationService implements IExperienceAndEducationService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Experience)
    private readonly expRepository: Repository<Experience>,
    @InjectRepository(Education)
    private readonly eduRepository: Repository<Education>,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  async removeEmployeeExperience(
    removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
  ): Promise<RemoveEmployeeExperienceResponseDTO> {
    const { employeeId, experienceId } = removeEmployeeExperienceDTO;
    try {
      const removeExp = await this.expRepository.findOne({
        where: { id: experienceId, employee: { id: employeeId } },
        relations: ['employee'],
      });

      if (!removeExp)
        throw new RpcException({
          statusCode: 404,
          message: "There's no experience with this id",
        });

      // Invalidate cache after deletion
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      await this.expRepository.delete(experienceId);

      return new RemoveEmployeeExperienceResponseDTO({
        message: `${removeExp.title} experience was removed successfully.`,
      });
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's experience",
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: "An error occurred while removing the employee's experience",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeEducation(
    removeEmployeeEducationDTO: RemoveEmployeeEducationDTO,
  ): Promise<RemoveEmployeeEducationResponseDTO> {
    const { employeeId, educationId } = removeEmployeeEducationDTO;
    try {
      const removeEdu = await this.eduRepository.findOne({
        where: { id: educationId, employee: { id: employeeId } },
        relations: ['employee'],
      });

      if (!removeEdu)
        throw new RpcException({
          statusCode: 404,
          message: "There's no education with this id",
        });

      // Invalidate cache after deletion
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      await this.eduRepository.delete(educationId);

      return new RemoveEmployeeEducationResponseDTO({
        message: `${removeEdu.school} education was removed successfully`,
      });
    } catch (error) {
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's education",
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: "An error occurred while removing the employee's education",
        statusCode: 500,
      });
    }
  }
}
