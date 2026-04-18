import { AuthGuard } from '@app/common/guards/auth.guard';
import { ICompanyController } from '@app/contracts/interfaces/domain/company.interface';
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
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { CompanyResponseDTO, UpdateCompanyInfoResponseDTO, UpdateCompanyInfoDTO } from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { rpcCall } from '../utils/rpc-call';

@Controller('user/company')
@UseGuards(AuthGuard)
export class CompanyController implements ICompanyController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAll(
    @Query() pagination: PaginationDTO,
  ): Promise<CompanyResponseDTO[]> {
    return rpcCall<CompanyResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_COMPANY,
      { pagination },
    );
  }

  @Get('one/:companyId')
  async findOneById(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<CompanyResponseDTO> {
    return rpcCall<CompanyResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID,
      { companyId },
    );
  }

  @Patch('update-info/:companyId')
  async updateCompanyInfo(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() updateCompanyInfoDTO: UpdateCompanyInfoDTO,
  ): Promise<UpdateCompanyInfoResponseDTO> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO, {
      companyId,
      updateCompanyInfoDTO,
    });
  }

  @Post('upload-avatar/:companyId')
  @UseInterceptors(new UploadFileInterceptor('avatar', 'company-avatars'))
  async uploadCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR,
      { companyId, avatar },
    );
  }

  @Post('remove-avatar/:companyId')
  async removeCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR,
      { companyId },
    );
  }

  @Post('upload-cover/:companyId')
  @UseInterceptors(new UploadFileInterceptor('cover', 'company-covers'))
  async uploadCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER,
      { cover, companyId },
    );
  }

  @Post('remove-cover/:companyId')
  async removeCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER,
      { companyId },
    );
  }

  @Post('upload-images/:companyId')
  @UseInterceptors(UploadFilesInterceptor('images', 'company-images', 5))
  async uploadCompanyImages(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES,
      { images, companyId },
    );
  }

  @Delete('remove-images/:companyId/:imageId')
  async removeCompanyImage(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES,
      { companyId, imageId },
    );
  }

  @Delete('remove-open-position/:companyId/:opId')
  async removeOpenPosition(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opId', ParseUUIDPipe) opId: string,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION,
      { companyId, opId },
    );
  }
}
