import { Company } from '@app/common/database/entities/company/company.entity';
import { Image } from '@app/common/database/entities/company/image.entity';
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
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
  ) {}

  async uploadCompanyAvatar(companyId: string, avatar: Express.Multer.File) {
    try {
      let company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        const avatarPath = path.join(
          process.cwd(),
          'storage/company-avatars',
          avatar.filename,
        );
        UploadfileService.deleteFile(avatarPath, 'Avatar Image');

        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 401,
        });
      }

      if (company.avatar) {
        const oldAvatarFilename = path.basename(company.avatar);
        const oldAvatarPath = path.join(
          process.cwd(),
          'storage/company-avatars',
          oldAvatarFilename,
        );
        UploadfileService.deleteFile(oldAvatarPath, 'Old Avatar Image');
      }

      const avatarUrl = this.uploadFileService.getUploadFile(
        'company-avatars',
        avatar,
      );
      company.avatar = avatarUrl;

      await this.companyRepository.save(company);

      return { message: "Company's avatar was successfully set." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while uploading the company's avatar.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyAvatar(companyId: string) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company)
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 401,
        });

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

      return { message: "Company's avatar was successfully deleted." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while removing the company's avatar.",
        statusCode: 500,
      });
    }
  }

  async uploadCompanyCover(companyId: string, cover: Express.Multer.File) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company)
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 401,
        });

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

      return { message: "Company's cover was successfully set." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while uploading the company's cover.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyCover(companyId: string) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company)
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 401,
        });

      if (company.cover) {
        const oldCoverFilename = path.basename(company.cover);
        const oldCoverPath = path.join(
          process.cwd(),
          'storage/company-covers',
          oldCoverFilename,
        );
        UploadfileService.deleteFile(oldCoverPath, 'Old Cover Image');
      }

      company.cover = null;

      await this.companyRepository.save(company);

      return { message: "Company's cover was successfully deleted." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while removing the company's cover.",
        statusCode: 500,
      });
    }
  }

  async uploadCompanyImage(companyId: string, images: Express.Multer.File[]) {
    try {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (!company)
        throw new RpcException({
          message: 'There is no company with this ID',
          statusCode: 401,
        });

      const imageUrls = images.map((image) =>
        this.uploadFileService.getUploadFile('company-images', image),
      );
      const companyImages = imageUrls.map((imageUrl) =>
        this.imageRepository.create({
          company: company,
          image: imageUrl,
        }),
      );

      await this.imageRepository.save(companyImages);
      await this.companyRepository.save(company);

      return { message: "Company's images was successfully set." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while uploading the company's images.",
        statusCode: 500,
      });
    }
  }

  async removeCompanyImage(imageId: string) {
    try {
      const image = await this.imageRepository.findOne({
        where: { id: imageId },
      });
      if (!image)
        throw new RpcException({
          message: "There's no image with ID",
          statusCode: 401,
        });

      // Delete file from disk
      const filename = path.basename(image.image); // get the file name from URL
      const filePath = path.join(
        process.cwd(),
        'storage/company-images',
        filename,
      );
      UploadfileService.deleteFile(filePath, 'Company Image');

      await this.imageRepository.delete({ id: imageId });

      return { message: "Company's image was successfully removed." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while removing the company's images.",
        statusCode: 500,
      });
    }
  }
}
