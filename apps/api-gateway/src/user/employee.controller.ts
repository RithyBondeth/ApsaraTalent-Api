import { AuthGuard } from '@app/common/guards/auth.guard';
import { IEmployeeController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
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
import { PaginationDTO } from '@app/contracts/dtos/user';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { EmployeeResponseDTO } from 'apps/user-service/src/dtos/user-response.dto'; // TODO: move to @app/contracts/dtos/user
import { rpcCall } from '../utils/rpc-call';

@Controller('user/employee')
@UseGuards(AuthGuard)
export class EmployeeController implements IEmployeeController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAll(@Query() pagination: PaginationDTO): Promise<EmployeeResponseDTO[]> {
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE,
      { pagination },
    );
  }

  @Get('one/:employeeId')
  async findOneById(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<EmployeeResponseDTO> {
    return rpcCall<EmployeeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID,
      { employeeId },
    );
  }

  @Patch('update-info/:employeeId')
  async updateEmployeeInfo(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeInfoDTO: any,
  ) {
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO,
      { employeeId, updateEmployeeInfoDTO },
    );
  }

  @Post('upload-avatar/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('avatar', 'employee-avatars'))
  async uploadEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<MessageResponse> {
    if (!avatar) throw new BadRequestException('No file uploaded');
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR,
      { employeeId, avatar },
    );
  }

  @Post('remove-avatar/:employeeId')
  async removeEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR,
      { employeeId },
    );
  }

  @Post('upload-resume/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('resume', 'resumes'))
  async uploadEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() resume: Express.Multer.File,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME,
      { employeeId, resume },
    );
  }

  @Post('remove-resume/:employeeId')
  async removeEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME,
      { employeeId },
    );
  }

  @Post('upload-cover-letter/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('coverLetter', 'cover-letters'))
  async uploadEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() coverLetter: Express.Multer.File,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER,
      { employeeId, coverLetter },
    );
  }

  @Post('remove-cover-letter/:employeeId')
  async removeEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER,
      { employeeId },
    );
  }

  @Delete('remove-education/:employeeId/:educationId')
  async removeEmployeeEducation(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('educationId', ParseUUIDPipe) educationId: string,
  ) {
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION,
      { employeeId, educationId },
    );
  }

  @Delete('remove-experience/:employeeId/:experienceId')
  async removeEmployeeExperience(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
  ) {
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE,
      { employeeId, experienceId },
    );
  }

  @Get('search-employee')
  async searchEmployee(
    @Query() searchEmployeeQuery: any,
  ): Promise<EmployeeResponseDTO[]> {
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES,
      searchEmployeeQuery,
    );
  }
}
