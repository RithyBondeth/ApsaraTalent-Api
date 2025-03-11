import { BadRequestException, Body, Controller, Inject, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user')
export class UserController {
  constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}

  @Post('upload-avatar/:userId') 
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@Param('userId') userId: string, @UploadedFile() avatar: Express.Multer.File) {
    if (!avatar) throw new BadRequestException('No file uploaded');

    // ✅ Convert buffer to a base64 string to send via microservices
    const fileData = {
      originalname: avatar.originalname,
      mimetype: avatar.mimetype,
      buffer: avatar.buffer.toString('base64'), // ✅ Convert to Base64 for transport
    };

    const payload = { userId, avatar: fileData };

    return firstValueFrom(this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_AVATAR, payload));
  }
}
