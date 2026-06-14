import { AuthGuard } from '@app/common/guards/auth.guard';
import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { ICompanyController } from '@app/contracts/interfaces/controller/user-controllers/company-controller.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { UploadFilesInterceptor } from '@app/common/uploadfile/uploadfiles.interceptor';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@app/contracts/constants/domain/upload.constant';
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
import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  RemoveCompanyAvatarResponseDTO,
  RemoveCompanyCoverResponseDTO,
  RemoveCompanyImageResponseDTO,
  RemoveOpenPositionResponseDTO,
  UpdateCompanyInfoDTO,
  UpdateCompanyInfoResponseDTO,
  UploadCompanyAvatarResponseDTO,
  UploadCompanyCoverResponseDTO,
  UploadCompanyImagesResponseDTO,
} from '@app/contracts/dtos/user';
import { rpcCall } from '../../utils/rpc-call';

@Controller('user/company')
@UseGuards(AuthGuard)
export class CompanyController implements ICompanyController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAll(
    @Query() paginationDTO: PaginationDTO,
  ): Promise<CompanyResponseDTO[]> {
    return rpcCall<CompanyResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_COMPANY,
      paginationDTO,
    );
  }

  @Get('one/:companyId')
  async findOneById(
    @User() user: AuthUser,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<CompanyResponseDTO> {
    return rpcCall<CompanyResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID,
      { companyId, requesterId: user.id },
    );
  }

  @Patch('update-info/:companyId')
  async updateCompanyInfo(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() updateCompanyInfoDTO: UpdateCompanyInfoDTO,
  ): Promise<UpdateCompanyInfoResponseDTO> {
    return rpcCall<UpdateCompanyInfoResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO,
      {
        companyId,
        updateCompanyInfoDTO,
      },
    );
  }

  @Post('upload-avatar/:companyId')
  @UseInterceptors(
    new UploadFileInterceptor(
      'avatar',
      'company-avatars',
      ALLOWED_IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE_BYTES,
    ),
  )
  async uploadCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() avatar: Express.Multer.File,
  ): Promise<UploadCompanyAvatarResponseDTO> {
    return rpcCall<UploadCompanyAvatarResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR,
      { companyId, avatar },
    );
  }

  @Post('remove-avatar/:companyId')
  async removeCompanyAvatar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<RemoveCompanyAvatarResponseDTO> {
    return rpcCall<RemoveCompanyAvatarResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR,
      { companyId },
    );
  }

  @Post('upload-cover/:companyId')
  @UseInterceptors(
    new UploadFileInterceptor(
      'cover',
      'company-covers',
      ALLOWED_IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE_BYTES,
    ),
  )
  async uploadCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFile() cover: Express.Multer.File,
  ): Promise<UploadCompanyCoverResponseDTO> {
    return rpcCall<UploadCompanyCoverResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER,
      { cover, companyId },
    );
  }

  @Post('remove-cover/:companyId')
  async removeCompanyCover(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<RemoveCompanyCoverResponseDTO> {
    return rpcCall<RemoveCompanyCoverResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER,
      { companyId },
    );
  }

  @Post('upload-images/:companyId')
  @UseInterceptors(
    UploadFilesInterceptor(
      'images',
      'company-images',
      5,
      ALLOWED_IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE_BYTES,
    ),
  )
  async uploadCompanyImages(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<UploadCompanyImagesResponseDTO> {
    return rpcCall<UploadCompanyImagesResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES,
      { images, companyId },
    );
  }

  @Delete('remove-images/:companyId/:imageId')
  async removeCompanyImage(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<RemoveCompanyImageResponseDTO> {
    return rpcCall<RemoveCompanyImageResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES,
      { companyId, imageId },
    );
  }

  @Delete('remove-open-position/:companyId/:opId')
  async removeOpenPosition(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opId', ParseUUIDPipe) opId: string,
  ): Promise<RemoveOpenPositionResponseDTO> {
    return rpcCall<RemoveOpenPositionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION,
      { companyId, opId },
    );
  }

  @Get('count')
  async countAllCompanies(): Promise<CountAllUsersResponseDTO> {
    return rpcCall<CountAllUsersResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY,
      {},
    );
  }
}
