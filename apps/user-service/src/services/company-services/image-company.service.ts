import { Company } from '@app/common/database/entities/company/company.entity';
import { Image } from '@app/common/database/entities/company/image.entity';
import { User } from '@app/common/database/entities/user.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import { Repository } from 'typeorm';

@Injectable()
export class ImageCompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Invalidate all caches that could contain stale company image fields.
   * This targets:
   * - user detail cache for any user linked to the company
   * - all users list cache (if used)
   */
  private async invalidateCompanyCaches(companyId: string): Promise<void> {
    const users = await this.userRepository.find({
      where: { company: { id: companyId } },
      select: ['id'],
    });

    const keysToDelete: string[] = users.map((u) =>
      this.redisService.generateUserKey('detail', u.id),
    );

    // if you cache "all users" list
    keysToDelete.push(this.redisService.generateListKey('user', {}));

    await Promise.all(keysToDelete.map((k) => this.redisService.del(k)));

    this.logger.info({ companyId, keysToDelete }, 'Company caches invalidated');
  }

  async uploadCompanyAvatar(companyId: string, avatar: Express.Multer.File) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        // delete uploaded file to avoid orphan file
        const avatarPath = path.join(
          process.cwd(),
          'storage/company-avatars',
          avatar.filename,
        );
        UploadfileService.deleteFile(avatarPath, 'Avatar Image');

        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 404,
        });
      }

      // delete old avatar file from disk if exists
      if (company.avatar) {
        const oldAvatarFilename = path.basename(company.avatar);
        const oldAvatarPath = path.join(
          process.cwd(),
          'storage/company-avatars',
          oldAvatarFilename,
        );
        UploadfileService.deleteFile(oldAvatarPath, 'Old Avatar Image');
      }

      // generate new URL and persist
      const avatarUrl = this.uploadFileService.getUploadFile(
        'company-avatars',
        avatar,
      );

      company.avatar = avatarUrl;

      await this.companyRepository.save(company);

      // Invalidate user caches (fix for stale avatar in findOneUserByID)
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's avatar was successfully set." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while uploading the company's avatar.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while uploading the company's avatar.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyAvatar(companyId: string) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 404,
        });
      }

      // delete file from disk
      if (company.avatar) {
        const avatarFilename = path.basename(company.avatar);
        const avatarPath = path.join(
          process.cwd(),
          'storage/company-avatars',
          avatarFilename,
        );
        UploadfileService.deleteFile(avatarPath, 'Avatar Image');
      }

      company.avatar = null;
      await this.companyRepository.save(company);

      // Invalidate caches
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's avatar was successfully deleted." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the company's avatar.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while removing the company's avatar.",
        statusCode: 500,
      });
    }
  }

  async uploadCompanyCover(companyId: string, cover: Express.Multer.File) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        const coverPath = path.join(
          process.cwd(),
          'storage/company-covers',
          cover.filename,
        );
        UploadfileService.deleteFile(coverPath, 'Cover Image');

        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 404,
        });
      }

      // delete old cover file from disk if exists
      if (company.cover) {
        const oldCoverFilename = path.basename(company.cover);
        const oldCoverPath = path.join(
          process.cwd(),
          'storage/company-covers',
          oldCoverFilename,
        );
        UploadfileService.deleteFile(oldCoverPath, 'Old Cover Image');
      }

      const coverUrl = this.uploadFileService.getUploadFile(
        'company-covers',
        cover,
      );

      company.cover = coverUrl;
      await this.companyRepository.save(company);

      // Invalidate caches (cover is also part of cached user detail)
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's cover was successfully set." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while uploading the company's cover.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while uploading the company's cover.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyCover(companyId: string) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 404,
        });
      }

      if (company.cover) {
        const coverFilename = path.basename(company.cover);
        const coverPath = path.join(
          process.cwd(),
          'storage/company-covers',
          coverFilename,
        );
        UploadfileService.deleteFile(coverPath, 'Cover Image');
      }

      company.cover = null;
      await this.companyRepository.save(company);

      // Invalidate caches
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's cover was successfully deleted." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the company's cover.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while removing the company's cover.",
        statusCode: 500,
      });
    }
  }

  async uploadCompanyImage(companyId: string, images: Express.Multer.File[]) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        // delete uploaded files to avoid orphan files
        for (const img of images) {
          const imgPath = path.join(
            process.cwd(),
            'storage/company-images',
            img.filename,
          );
          UploadfileService.deleteFile(imgPath, 'Company Image');
        }

        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 404,
        });
      }

      const imageUrls = images.map((image) =>
        this.uploadFileService.getUploadFile('company-images', image),
      );

      const companyImages = imageUrls.map((imageUrl) =>
        this.imageRepository.create({
          company,
          image: imageUrl,
        }),
      );

      await this.imageRepository.save(companyImages);

      // Invalidate caches (company.images is used in cached user response)
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's images were successfully set." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while uploading the company's images.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while uploading the company's images.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyImage(companyId: string, imageId: string) {
    try {
      const image = await this.imageRepository.findOne({
        where: { id: imageId, company: { id: companyId } },
      });

      if (!image) {
        throw new RpcException({
          message: "There's no image with this ID",
          statusCode: 404,
        });
      }

      // delete file from disk
      const filename = path.basename(image.image);
      const filePath = path.join(
        process.cwd(),
        'storage/company-images',
        filename,
      );
      UploadfileService.deleteFile(filePath, 'Company Image');

      await this.imageRepository.delete({ id: imageId });

      // Invalidate caches
      await this.invalidateCompanyCaches(companyId);

      return { message: "Company's image was successfully removed." };
    } catch (error) {
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the company's image.",
      );

      if (error instanceof RpcException) throw error;

      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while removing the company's image.",
        statusCode: 500,
      });
    }
  }
}
