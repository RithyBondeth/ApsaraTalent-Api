import { UploadFileInterceptor } from "@app/common/uploadfile/uploadfile.interceptor";
import { BadRequestException, Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
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
            this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BYID, payload)
        )
    }

    @Put('update-info/:employeeId')
    async updateEmployeeInfon(
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
        @UploadedFile() avatar: Express.Multer.File
    ) {
        if (!avatar) throw new BadRequestException('No file uploaded');
        const payload = { employeeId, avatar };
        return firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR, payload)
        )
    }
}