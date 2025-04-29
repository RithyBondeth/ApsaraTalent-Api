import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import { Repository } from 'typeorm';

@Injectable()
export class ImageEmployeeService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
  ) {}

  async uploadEmployeeAvatar(employeeId: string, avatar: Express.Multer.File) {
    try {
      let employee = await this.employeeRepository.findOne({
        where: { id: employeeId }
      });
     
      if(!employee) {
        const avatarPath = path.join(process.cwd(), 'storage/employee-avatars', avatar.filename); 
        UploadfileService.deleteFile(avatarPath, 'Avatar Image'); 
        
        throw new NotFoundException(`There's no employee with ID ${employeeId}`);
      }

      if(employee.avatar) {
        const oldAvatarFilename = path.basename(employee.avatar);
        const oldAvatarPath = path.join(process.cwd(), 'storage/employee-avatars', oldAvatarFilename);  
        UploadfileService.deleteFile(oldAvatarPath, 'Old Avatar Image');
      }
      
      const avatarUrl = this.uploadFileService.getUploadFile('employee-avatars', avatar);
      employee.avatar = avatarUrl;

      await this.employeeRepository.save(employee);
  
      return { message: "Employee's avatar was successfully set." };
    } catch (error) {
        // Handle error
        this.logger.error(error.message);  
        throw new BadRequestException("An error occurred while uploading the employee's avatar.");
    }
  }

  async removeEmployeeAvatar(employeeId: string) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId }
      });
      if(!employee) throw new NotFoundException(`There's no employee with ID ${employeeId}`);

      if(employee.avatar) {
        const avatarFilename = path.basename(employee.avatar);
        const avatarPath = path.join(process.cwd(), 'storage/employee-avatars', avatarFilename);  
        UploadfileService.deleteFile(avatarPath, 'Avatar Image');
      }
      employee.avatar = null;

      await this.employeeRepository.save(employee);

      return { message: "Employee's avatar was successfully deleted." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);  
      throw new BadRequestException("An error occurred while removing the employee's avatar.");
    }
  }
}
