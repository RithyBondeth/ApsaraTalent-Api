import { UploadFileInterceptor } from "@app/common/uploadfile/uploadfile.interceptor";
import { BadRequestException, Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller('user/employee')
export class EmployeeController {
    constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}
    @Get('all')
    async findAll() {
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE, {})
        )
    }

    @Get('one/:employeeId')
    async findOneById(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        const payload = { employeeId };  
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID, payload)
        )
    }

    @Patch('update-info/:employeeId')
    async updateEmployeeInfo(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @Body() updateEmployeeInfoDTO: any
    ) {
        const payload = { employeeId, updateEmployeeInfoDTO };
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO, payload)
        )
    }

    @Post('upload-avatar/:employeeId')
    @UseInterceptors(new UploadFileInterceptor('avatar', 'employee-avatars'))
    async uploadEmployeeAvatar(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @UploadedFile() avatar: Express.Multer.File,
    ) {
        if(!avatar) throw new BadRequestException('No file uploaded');
        const payload = { employeeId, avatar };
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR, payload)
        )
    }

    @Post('remove-avatar/:employeeId')
    async removeEmployeeAvatar(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        const payload = { employeeId };
        return firstValueFrom(
          this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR, payload)  
        )
    }

    @Post('upload-resume/:employeeId')
    @UseInterceptors(new UploadFileInterceptor('resume', 'resumes'))
    async uploadEmployeeResume(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @UploadedFile() resume: Express.Multer.File,
    ) {
        const payload = { employeeId, resume };
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME, payload)
        )
    }

    @Post('remove-resume/:employeeId')
    async removeEmployeeResume(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        const payload = { employeeId };  
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME, payload)
        )
    }  

    @Post('upload-cover-letter/:employeeId')
    @UseInterceptors(new UploadFileInterceptor('coverLetter', 'cover-letters'))
    async uploadEmployeeCoverLetter(
        @Param('employeeId', ParseUUIDPipe) employeeId: string,
        @UploadedFile() coverLetter: Express.Multer.File,
    ) {
        const payload = { employeeId, coverLetter };
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER, payload)
        )
    }

    @Post('remove-cover-letter/:employeeId')
    async removeEmployeeCoverLetter(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
        const payload = { employeeId };
        return firstValueFrom(
            this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER, payload)
        )
    }
}