import { AuthGuard } from '@app/common/guards/auth.guard';
import { ICompanyController } from '@app/common/interfaces/company.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { UploadFilesInterceptor } from '@app/common/uploadfile/uploadfiles.interceptor';
import {
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user/company')
@UseGuards(AuthGuard)
export class CompanyController implements ICompanyController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAll(@Query() pagination: any) {
    const payload = { pagination };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY, payload),
    );
  }

  @Get('one/:companyId')
  async findOneById(@Param('companyId', ParseUUIDPipe) companyId: string) {
    const payload = { companyId };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID,
        payload,
      ),
    );
  }

  @Patch('update-info/:companyId')
  async updateCompanyInfo(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() updateCompanyInfoDTO: any,
  ) {
    const payload = { companyId, updateCompanyInfoDTO };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO, payload),
    );
  }

  @Post('upload-avatar/:companyId')
  @UseInterceptors(new UploadFileInterceptor('avatar', 'company-avatars'))
  async uploadCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    const payload = { companyId, avatar };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR, payload),
    );
  }

  @Post('remove-avatar/:companyId')
  async removeCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    const payload = { companyId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR, payload),
    );
  }

  @Post('upload-cover/:companyId')
  @UseInterceptors(new UploadFileInterceptor('cover', 'company-covers'))
  async uploadCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() cover: Express.Multer.File,
  ) {
    const payload = { cover, companyId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER, payload),
    );
  }

  @Post('remove-cover/:companyId')
  async removeCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    const payload = { companyId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER, payload),
    );
  }

  @Post('upload-images/:companyId')
  @UseInterceptors(UploadFilesInterceptor('images', 'company-images', 5))
  async uploadCompanyImages(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    const payload = { images, companyId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES, payload),
    );
  }

  @Delete('remove-images/:imageId')
  async removeCompanyImage(@Param('imageId', ParseUUIDPipe) imageId: string) {
    const payload = { imageId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES, payload),
    );
  }

  @Delete('remove-open-position/:companyId/:opId')
  async removeOpenPosition(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opId', ParseUUIDPipe) opId: string,
  ) {
    const payload = { companyId, opId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION, payload),
    );
  }
}
