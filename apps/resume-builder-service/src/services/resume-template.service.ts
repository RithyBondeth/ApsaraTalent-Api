import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';
import { IResumeTemplateService } from '@app/contracts/interfaces/service/resume-builder-service.interface';
import { RESUME } from '@app/contracts';

@Injectable()
export class ResumeTemplateService implements IResumeTemplateService {
  constructor(
    @InjectRepository(ResumeTemplate)
    private readonly resumeTemplateRepository: Repository<ResumeTemplate>,
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  async findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]> {
    const cacheKey = this.redisService.generateTemplateListKey();
    const cached =
      await this.redisService.get<ResumeTemplateResponseDTO[]>(cacheKey);
    if (cached) {
      this.logger.info('All resume templates cache HIT');
      return cached;
    }
    this.logger.info('All resume templates cache MISS');

    try {
      const templates = await this.resumeTemplateRepository.find();
      if (!templates || templates.length === 0)
        throw new RpcException({
          message: 'There are no templates available.',
          statusCode: 404,
        });

      const result = templates.map(
        (template) => new ResumeTemplateResponseDTO(template),
      );
      await this.redisService.set(cacheKey, result, RESUME.TEMPLATE_TTL);
      return result;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error).message ||
          "An error occurred while fetching all resume's templates.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while fetching all resume's templates.",
        statusCode: 500,
      });
    }
  }

  async findOneResumeTemplate(
    resumeId: string,
  ): Promise<ResumeTemplateResponseDTO> {
    const cacheKey = this.redisService.generateTemplateDetailKey(resumeId);
    const cached =
      await this.redisService.get<ResumeTemplateResponseDTO>(cacheKey);
    if (cached) {
      this.logger.info(`Resume template ${resumeId} cache HIT`);
      return cached;
    }
    this.logger.info(`Resume template ${resumeId} cache MISS`);

    try {
      const template = await this.resumeTemplateRepository.findOne({
        where: { id: resumeId },
      });
      if (!template)
        throw new RpcException({
          message: 'There are no templates available with this id.',
          statusCode: 404,
        });

      const result = new ResumeTemplateResponseDTO(template);
      await this.redisService.set(cacheKey, result, RESUME.TEMPLATE_TTL);
      return result;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error).message ||
          "An error occurred while fetching a resume's templates.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while fetching a resume's templates.",
        statusCode: 500,
      });
    }
  }

  async createResumeTemplate(
    createResumeTemplateDTO: CreateResumeTemplateDTO,
    image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO> {
    try {
      const template = this.resumeTemplateRepository.create({
        title: createResumeTemplateDTO.title,
        description: createResumeTemplateDTO.description,
        price: Number(createResumeTemplateDTO.price) || 0,
        isPremium: Boolean(createResumeTemplateDTO.isPremium) ?? false,
      });

      if (image) {
        const imageUrl = this.uploadFileService.getUploadFile(
          'template-images',
          image,
        );
        template.image = imageUrl;
      }

      await this.resumeTemplateRepository.save(template);

      // Invalidate list cache so the new template appears immediately
      await this.redisService.invalidateTemplateCaches();

      return new CreateResumeTemplateResponseDTO({
        message: "Resume's template was successfully created.",
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while creating the resume's template.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while creating the resume's template.",
        statusCode: 500,
      });
    }
  }

  async searchResumeTemplate(
    searchResumeTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]> {
    const cacheKey = this.redisService.generateTemplateSearchKey(
      searchResumeTemplateDTO,
    );
    const cached =
      await this.redisService.get<SearchResumeTemplateResponseDTO[]>(cacheKey);
    if (cached) {
      this.logger.info('Resume template search cache HIT');
      return cached;
    }
    this.logger.info('Resume template search cache MISS');

    try {
      const query = this.resumeTemplateRepository.createQueryBuilder('resume');

      let whereUsed = false;

      if (searchResumeTemplateDTO.title) {
        query.where('resume.title LIKE :title', {
          title: `%${searchResumeTemplateDTO.title}%`,
        });
        whereUsed = true;
      }

      if (typeof searchResumeTemplateDTO.isPremium !== 'undefined') {
        const isPremiumBool =
          String(searchResumeTemplateDTO.isPremium).toLowerCase() === 'true';
        if (whereUsed) {
          query.andWhere('resume.isPremium = :isPremium', {
            isPremium: isPremiumBool,
          });
        } else {
          query.where('resume.isPremium = :isPremium', {
            isPremium: isPremiumBool,
          });
        }
      }

      const templates = await query.getMany();

      if (!templates.length) {
        throw new RpcException({
          message: 'No templates found matching your criteria.',
          statusCode: 404,
        });
      }

      const result = templates.map(
        (template) => new SearchResumeTemplateResponseDTO(template),
      );
      await this.redisService.set(cacheKey, result, RESUME.TEMPLATE_SEARCH_TTL);
      return result;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      this.logger.error(
        (error as Error).message ||
          "An error occurred while searching the resume's templates.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while searching the resume's templates.",
        statusCode: 500,
      });
    }
  }
}
