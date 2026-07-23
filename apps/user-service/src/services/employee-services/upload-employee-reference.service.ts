import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import * as path from 'path';
import { Repository } from 'typeorm';
import { IUploadEmployeeReferenceService } from '@app/contracts/interfaces/service/user-service.interface';
import {
  EmployeeIdDTO,
  RemoveEmployeeCoverLetterResponseDTO,
  RemoveEmployeeResumeResponseDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeDTO,
  UploadEmployeeResumeResponseDTO,
} from '@app/contracts/dtos/user';

@Injectable()
export class UploadEmployeeReferenceService implements IUploadEmployeeReferenceService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly uploadFileService: UploadfileService,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly logger: PinoLogger,
  ) {}

  async uploadEmployeeResume(
    uploadEmployeeResumeDTO: UploadEmployeeResumeDTO,
  ): Promise<UploadEmployeeResumeResponseDTO> {
    const { employeeId, resume } = uploadEmployeeResumeDTO;
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

      // Cache Invalidation
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      return new UploadEmployeeResumeResponseDTO({
        message: "Employee's resume was successfully set.",
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while uploading the employee's resume.",
      );
      throw new RpcException({
        message: "An error occurred while uploading the employee's resume.",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeResume(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeResumeResponseDTO> {
    const { employeeId } = employeeIdDTO;
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

      // Cache Invalidation
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      return new RemoveEmployeeResumeResponseDTO({
        message: "Employee's resume was successfully deleted.",
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's resume.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while removing the employee's resume.",
        statusCode: 500,
      });
    }
  }

  async uploadEmployeeCoverLetter(
    uploadEmployeeCoverLetterDTO: UploadEmployeeCoverLetterDTO,
  ): Promise<UploadEmployeeCoverLetterResponseDTO> {
    const { employeeId, coverLetter } = uploadEmployeeCoverLetterDTO;
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

      // Cache Invalidation
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      return new UploadEmployeeCoverLetterResponseDTO({
        message: "Employee's cover letter was successfully set.",
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while uploading the employee's cover letter.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while uploading the employee's cover letter.",
        statusCode: 500,
      });
    }
  }

  async removeEmployeeCoverLetter(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeCoverLetterResponseDTO> {
    const { employeeId } = employeeIdDTO;
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

      // Cache Invalidation
      await this.cacheInvalidationService.invalidateEmployeeCache(employeeId);

      return new RemoveEmployeeCoverLetterResponseDTO({
        message: "Employee's cover letter was successfully deleted.",
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      // Handle error
      this.logger.error(
        (error as Error).message ||
          "An error occurred while removing the employee's cover letter.",
      );
      throw new RpcException({
        message:
          (error as Error).message ||
          "An error occurred while removing the employee's cover letter.",
        statusCode: 500,
      });
    }
  }
}
