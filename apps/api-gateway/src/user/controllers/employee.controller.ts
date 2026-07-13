import { AuthGuard } from '@app/common/guards/auth.guard';
import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { IEmployeeController } from '@app/contracts/interfaces/controller/user-controllers/employee-controller.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from '@app/contracts/constants/domain/upload.constant';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  EmployeeResponseDTO,
  RemoveEmployeeAvatarResponseDTO,
  RemoveEmployeeCoverLetterResponseDTO,
  RemoveEmployeeEducationResponseDTO,
  RemoveEmployeeExperienceResponseDTO,
  RemoveEmployeeResumeResponseDTO,
  SearchEmployeeDTO,
  SearchEmployeeResult,
  UpdateEmployeeInfoDTO,
  UpdateEmployeeInfoResponseDTO,
  UploadEmployeeAvatarResponseDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeResponseDTO,
} from '@app/contracts/dtos/user';
import { rpcCall } from '../../utils/rpc-call';
import { EmployeeProfileOwnerGuard } from '../guards/employee-profile-owner.guard';
import { EmployeeDocumentAccessGuard } from '../guards/employee-document-access.guard';
import { Response } from 'express';
import { access } from 'fs/promises';
import { basename, resolve, sep } from 'path';
import { EEmployeeDocumentType } from '@app/common/database/enums/employee-document-type.enum';

@Controller('user/employee')
@UseGuards(AuthGuard)
export class EmployeeController implements IEmployeeController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAll(
    @User() user: AuthUser,
    @Query() paginationDTO: PaginationDTO,
  ): Promise<EmployeeResponseDTO[]> {
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE,
      { ...paginationDTO, requesterId: user.id },
    );
  }

  @Get('one/:employeeId')
  async findOneById(
    @User() user: AuthUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<EmployeeResponseDTO> {
    return rpcCall<EmployeeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID,
      { employeeId, requesterId: user.id },
    );
  }

  @Get(':employeeId/document/:type')
  @UseGuards(EmployeeDocumentAccessGuard)
  async getDocument(
    @User() user: AuthUser,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('type', new ParseEnumPipe(EEmployeeDocumentType))
    documentType: EEmployeeDocumentType,
    @Res() res: Response,
  ): Promise<void> {
    const employee = await rpcCall<EmployeeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID,
      { employeeId, requesterId: user.id },
    );
    const storedPath =
      documentType === EEmployeeDocumentType.RESUME
        ? employee.resume
        : employee.coverLetter;
    const folder =
      documentType === EEmployeeDocumentType.RESUME
        ? 'resumes'
        : 'cover-letters';

    if (!storedPath || !storedPath.startsWith(`/storage/${folder}/`)) {
      throw new NotFoundException('Document not found');
    }

    const documentRoot = resolve(process.cwd(), 'storage', folder);
    const filePath = resolve(documentRoot, basename(storedPath));
    if (!filePath.startsWith(`${documentRoot}${sep}`)) {
      throw new NotFoundException('Document not found');
    }

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Document not found');
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(basename(filePath))}`,
    );
    res.sendFile(filePath);
  }

  @Patch('update-info/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async updateEmployeeInfo(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO> {
    return rpcCall<UpdateEmployeeInfoResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO,
      {
        employeeId,
        updateEmployeeInfoDTO,
      },
    );
  }

  @Post('upload-avatar/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  @UseInterceptors(
    new UploadFileInterceptor(
      'avatar',
      'employee-avatars',
      ALLOWED_IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE_BYTES,
    ),
  )
  async uploadEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<UploadEmployeeAvatarResponseDTO> {
    if (!avatar) throw new BadRequestException('No file uploaded');
    return rpcCall<UploadEmployeeAvatarResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR,
      { employeeId, avatar },
    );
  }

  @Post('remove-avatar/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async removeEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<RemoveEmployeeAvatarResponseDTO> {
    return rpcCall<RemoveEmployeeAvatarResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR,
      { employeeId },
    );
  }

  @Post('upload-resume/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  @UseInterceptors(
    new UploadFileInterceptor(
      'resume',
      'resumes',
      ALLOWED_DOCUMENT_MIME_TYPES,
      MAX_DOCUMENT_SIZE_BYTES,
    ),
  )
  async uploadEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() resume: Express.Multer.File,
  ): Promise<UploadEmployeeResumeResponseDTO> {
    return rpcCall<UploadEmployeeResumeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME,
      { employeeId, resume },
    );
  }

  @Post('remove-resume/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async removeEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<RemoveEmployeeResumeResponseDTO> {
    return rpcCall<RemoveEmployeeResumeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME,
      { employeeId },
    );
  }

  @Post('upload-cover-letter/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  @UseInterceptors(
    new UploadFileInterceptor(
      'coverLetter',
      'cover-letters',
      ALLOWED_DOCUMENT_MIME_TYPES,
      MAX_DOCUMENT_SIZE_BYTES,
    ),
  )
  async uploadEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() coverLetter: Express.Multer.File,
  ): Promise<UploadEmployeeCoverLetterResponseDTO> {
    return rpcCall<UploadEmployeeCoverLetterResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER,
      { employeeId, coverLetter },
    );
  }

  @Post('remove-cover-letter/:employeeId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async removeEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<RemoveEmployeeCoverLetterResponseDTO> {
    return rpcCall<RemoveEmployeeCoverLetterResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER,
      { employeeId },
    );
  }

  @Delete('remove-education/:employeeId/:educationId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async removeEmployeeEducation(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('educationId', ParseUUIDPipe) educationId: string,
  ): Promise<RemoveEmployeeEducationResponseDTO> {
    return rpcCall<RemoveEmployeeEducationResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION,
      { employeeId, educationId },
    );
  }

  @Delete('remove-experience/:employeeId/:experienceId')
  @UseGuards(EmployeeProfileOwnerGuard)
  async removeEmployeeExperience(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
  ): Promise<RemoveEmployeeExperienceResponseDTO> {
    return rpcCall<RemoveEmployeeExperienceResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE,
      { employeeId, experienceId },
    );
  }

  @Get('search-employee')
  async searchEmployee(
    @User() user: AuthUser,
    @Query() searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResult> {
    const payload = {
      ...searchEmployeeDTO,
      ...(searchEmployeeDTO.page && { page: Number(searchEmployeeDTO.page) }),
      ...(searchEmployeeDTO.pageSize && {
        pageSize: Number(searchEmployeeDTO.pageSize),
      }),
      requesterId: user.id,
    };
    return rpcCall<SearchEmployeeResult>(
      this.userClient,
      USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES,
      payload,
      20_000,
    );
  }
}
