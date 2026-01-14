import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { CreateResumeTemplateDTO } from '../dtos/create-resume-template.dto';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { PinoLogger } from 'nestjs-pino';
import { RpcException } from '@nestjs/microservices';
import { SearchTemplateDTO } from '../dtos/search-resume-template.dto';

@Injectable()
export class ResumeTemplateService {
  constructor(
    @InjectRepository(ResumeTemplate)
    private readonly resumeTemplateRepository: Repository<ResumeTemplate>,
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
  ) {}

  async findAllResumeTemplate(): Promise<any> {
    try {
      const templates = await this.resumeTemplateRepository.find();
      if (!templates)
        throw new RpcException({
          message: 'There are no templates available.',
          statusCode: 404,
        });

      return templates;
    } catch (error) {
      // Handle error
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

  async findOneResumeTemplate(resumeId: string): Promise<any> {
    try {
      const template = await this.resumeTemplateRepository.findOne({
        where: { id: resumeId },
      });
      if (!template)
        throw new RpcException({
          message: 'There are no templates available with this id.',
          statusCode: 404,
        });

      return template;
    } catch (error) {
      // Handle error
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
  ): Promise<any> {
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

      return { message: "Resume's template was successfully created." };
    } catch (error) {
      // Handle error
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
    searchTemplateDTO: SearchTemplateDTO,
  ): Promise<any> {
    try {
      const query = this.resumeTemplateRepository.createQueryBuilder('resume');

      let whereUsed = false;

      if (searchTemplateDTO.title) {
        query.where('resume.title LIKE :title', {
          title: `%${searchTemplateDTO.title}%`,
        });
        whereUsed = true;
      }

      if (typeof searchTemplateDTO.isPremium !== 'undefined') {
        const isPremiumBool =
          String(searchTemplateDTO.isPremium).toLowerCase() === 'true';
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

      return templates;
    } catch (error) {
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
