import { Company } from "@app/common/database/entities/company/company.entity";
import { UploadfileService } from "@app/common/uploadfile/uploadfile.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import * as path from "path";
import { Repository } from "typeorm";

@Injectable()
export class ImageCompanyService {
    constructor(
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
        private readonly uploadFileService: UploadfileService,
        private readonly logger: PinoLogger,
    ) {}
    
    async uploadCompanyAvatar(companyId: string, avatar: Express.Multer.File) {
        try {
            let company = await this.companyRepository.findOne({
                where: { id: companyId }
            });

            if(!company) {
                const avatarPath = path.join(process.cwd(), 'storage/company-avatars', avatar.filename); 
                UploadfileService.deleteFile(avatarPath, 'Avatar Image'); 
                
                throw new NotFoundException(`There's no company with ID ${companyId}`);
            }

            if(company.avatar) {
                const oldAvatarFilename = path.basename(company.avatar);
                const oldAvatarPath = path.join(process.cwd(), 'storage/company-avatars', oldAvatarFilename);  
                UploadfileService.deleteFile(oldAvatarPath, 'Old Avatar Image');
            }

            const avatarUrl = this.uploadFileService.getUploadFile('company-avatars', avatar);
            company.avatar = avatarUrl;

            await this.companyRepository.save(company);

            return { message: "Company's avatar was successfully set." }
        } catch (error) {
             // Handle error
            this.logger.error(error.message);  
            throw new BadRequestException("An error occurred while uploading the company's avatar.");
        }
    }

    async removeCompanyAvatar(companyId: string) {
        try {
          const company = await this.companyRepository.findOne({
            where: { id: companyId }
          });
          if(!company) throw new NotFoundException(`There's no company with ID ${company}`);
    
          if(company.avatar) {
            const avatarFilename = path.basename(company.avatar);
            const avatarPath = path.join(process.cwd(), 'storage/company-avatars', avatarFilename);  
            UploadfileService.deleteFile(avatarPath, 'Avatar Image');
          }
          company.avatar = null;
    
          await this.companyRepository.save(company);
    
          return { message: "Company's avatar was successfully deleted." };
        } catch (error) {
          // Handle error
          this.logger.error(error.message);  
          throw new BadRequestException("An error occurred while removing the company's avatar.");
        }
      }

      async uploadCompanyCover(companyId: string, cover: Express.Multer.File) {
        try {
          const company = await this.companyRepository.findOne({ 
            where: { id: companyId }
          });
          if(!company) throw new NotFoundException(`There's no company with ID ${company}`);

          if(company.cover) {
            const oldCoverFilename = path.basename(company.cover);
            const oldCoverPath = path.join(process.cwd(), 'storage/company-covers', oldCoverFilename);  
            UploadfileService.deleteFile(oldCoverPath, 'Old Cover Image');
          }
          const coverUrl = this.uploadFileService.getUploadFile('company-covers', cover);
          company.cover = coverUrl;

          await this.companyRepository.save(company);

          return { message: "Company's cover was successfully set." }
        } catch (error) {
          // Handle error
          this.logger.error(error.message);  
          throw new BadRequestException("An error occurred while uploading the company's cover.");
        }
      }
}