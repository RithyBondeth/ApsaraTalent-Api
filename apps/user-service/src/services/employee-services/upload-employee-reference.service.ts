import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as path from 'path';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UploadEmployeeReferenceService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly uploadFileService: UploadfileService,
    private readonly logger: PinoLogger,
  ) {}

  async uploadEmployeeResume(employeeId: string, resume: Express.Multer.File) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee) {
        const resumePath = path.join(
          process.cwd(),
          'storage/employee-avatars',
          resume.filename,
        );
        UploadfileService.deleteFile(resumePath, 'Resume File');

        throw new RpcException({
          message: 'There is no employee with this ID.',
          statusCode: 404,
        });
      }

      if (employee.resume) {
        const oldResumeFilename = path.basename(employee.resume);
        const oldResumePath = path.join(
          process.cwd(),
          'storage/resumes',
          oldResumeFilename,
        );
        UploadfileService.deleteFile(oldResumePath, 'Old Resume File');
      }

      const resumeUrl = this.uploadFileService.getUploadFile('resumes', resume);
      employee.resume = resumeUrl;

      await this.employeeRepository.save(employee);

      return { message: "Employee's resume was successfully set." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while uploading the employee's resume.",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeResume(employeeId: string) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee)
        throw new RpcException({
          message: 'There is no employee with this ID.',
          statusCode: 404,
        });

      if (employee.resume) {
        const oldResumeFilename = path.basename(employee.resume);
        const oldResumePath = path.join(
          process.cwd(),
          'storage/resumes',
          oldResumeFilename,
        );
        UploadfileService.deleteFile(oldResumePath, 'Old Resume File');
      }

      employee.resume = null;

      await this.employeeRepository.save(employee);

      return { message: "Employee's resume was successfully deleted." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message: "An error occurred while removing the employee's resume.",
        statusCode: 500,
      });
    }
  }

  async uploadEmployeeCoverLetter(
    employeeId: string,
    coverLetter: Express.Multer.File,
  ) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee) {
        const coverLetterPath = path.join(
          process.cwd(),
          'storage/cover-letters',
          coverLetter.filename,
        );
        UploadfileService.deleteFile(coverLetterPath, 'Cover Letter File');

        throw new RpcException({
          message: 'There is no employee with this ID.',
          statusCode: 404,
        });
      }

      if (employee.coverLetter) {
        const oldCoverLetterFilename = path.basename(employee.coverLetter);
        const oldCoverLetterPath = path.join(
          process.cwd(),
          'storage/cover-letters',
          oldCoverLetterFilename,
        );
        UploadfileService.deleteFile(
          oldCoverLetterPath,
          'Old Cover Letter File',
        );
      }

      const coverLetterUrl = this.uploadFileService.getUploadFile(
        'cover-letters',
        coverLetter,
      );
      employee.coverLetter = coverLetterUrl;

      await this.employeeRepository.save(employee);

      return { message: "Employee's cover letter was successfully set." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message:
          "An error occurred while uploading the employee's cover letter.",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeCoverLetter(employeeId: string) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee)
        throw new RpcException({
          message: 'There is no employee with this ID.',
          statusCode: 404,
        });

      if (employee.coverLetter) {
        const oldCoverLetterFilename = path.basename(employee.coverLetter);
        const oldCoverLetterPath = path.join(
          process.cwd(),
          'storage/cover-letters',
          oldCoverLetterFilename,
        );
        UploadfileService.deleteFile(
          oldCoverLetterPath,
          'Old Cover Letter File',
        );
      }

      employee.coverLetter = null;

      await this.employeeRepository.save(employee);

      return { message: "Employee's cover letter was successfully deleted." };
    } catch (error) {
      // Handle error
      this.logger.error(error.message);
      throw new RpcException({
        message:
          "An error occurred while removing the employee's cover letter.",
        statusCode: 500,
      });
    }
  }
}
