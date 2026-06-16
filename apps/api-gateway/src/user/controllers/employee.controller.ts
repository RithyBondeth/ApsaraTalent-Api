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
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  SearchEmployeeResponseDTO,
  SearchEmployeeResult,
  UpdateEmployeeInfoDTO,
  UpdateEmployeeInfoResponseDTO,
  UploadEmployeeAvatarResponseDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeResponseDTO,
} from '@app/contracts/dtos/user';
import { rpcCall } from '../../utils/rpc-call';

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

  @Patch('update-info/:employeeId')
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
