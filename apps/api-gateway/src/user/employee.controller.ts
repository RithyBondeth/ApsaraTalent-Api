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
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { EmployeeResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';

@Controller('user/employee')
@UseGuards(AuthGuard)
export class EmployeeController implements IEmployeeController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}
  @Get('all')
  async findAll(@Query() pagination: any): Promise<EmployeeResponseDTO[]> {
    const payload = { pagination };
    return firstValueFrom(
      this.userClient.send<EmployeeResponseDTO[]>(
        USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE,
        payload,
      ),
    );
  }

  @Get('one/:employeeId')
  async findOneById(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<EmployeeResponseDTO> {
    const payload = { employeeId };
    return firstValueFrom(
      this.userClient.send<EmployeeResponseDTO>(
        USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID,
        payload,
      ),
    );
  }

  @Patch('update-info/:employeeId')
  async updateEmployeeInfo(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeInfoDTO: any,
  ) {
    const payload = { employeeId, updateEmployeeInfoDTO };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO, payload),
    );
  }

  @Post('upload-avatar/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('avatar', 'employee-avatars'))
  async uploadEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<MessageResponse> {
    if (!avatar) throw new BadRequestException('No file uploaded');
    const payload = { employeeId, avatar };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR,
        payload,
      ),
    );
  }

  @Post('remove-avatar/:employeeId')
  async removeEmployeeAvatar(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    const payload = { employeeId };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR,
        payload,
      ),
    );
  }

  @Post('upload-resume/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('resume', 'resumes'))
  async uploadEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() resume: Express.Multer.File,
  ): Promise<MessageResponse> {
    const payload = { employeeId, resume };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME,
        payload,
      ),
    );
  }

  @Post('remove-resume/:employeeId')
  async removeEmployeeResume(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    const payload = { employeeId };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME,
        payload,
      ),
    );
  }

  @Post('upload-cover-letter/:employeeId')
  @UseInterceptors(new UploadFileInterceptor('coverLetter', 'cover-letters'))
  async uploadEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() coverLetter: Express.Multer.File,
  ): Promise<MessageResponse> {
    const payload = { employeeId, coverLetter };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER,
        payload,
      ),
    );
  }

  @Post('remove-cover-letter/:employeeId')
  async removeEmployeeCoverLetter(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<MessageResponse> {
    const payload = { employeeId };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER,
        payload,
      ),
    );
  }

  @Delete('remove-education/:employeeId/:educationId')
  async removeEmployeeEducation(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('educationId', ParseUUIDPipe) educationId: string,
  ) {
    const payload = { employeeId, educationId };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION,
        payload,
      ),
    );
  }

  @Delete('remove-experience/:employeeId/:experienceId')
  async removeEmployeeExperience(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('experienceId', ParseUUIDPipe) experienceId: string,
  ) {
    const payload = { employeeId, experienceId };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE,
        payload,
      ),
    );
  }

  @Get('search-employee')
  async searchEmployee(
    @Query() searchEmployeeQuery: any,
  ): Promise<EmployeeResponseDTO[]> {
    return firstValueFrom(
      this.userClient.send<EmployeeResponseDTO[]>(
        USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES,
        searchEmployeeQuery,
      ),
    );
  }
}
