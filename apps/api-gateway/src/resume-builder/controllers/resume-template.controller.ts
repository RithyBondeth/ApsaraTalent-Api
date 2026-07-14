import { AuthGuard } from '@app/common/guards/auth.guard';
import { IResumeTemplateController } from '@app/contracts/interfaces/controller/resume-builder-controller.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@app/contracts/constants/domain/upload.constant';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import {
  CreateResumeTemplateDTO,
  CreateResumeTemplateResponseDTO,
  ResumeTemplateResponseDTO,
  SearchResumeTemplateDTO,
  SearchResumeTemplateResponseDTO,
} from '@app/contracts/dtos/resume/template';
import { rpcCall } from '../../utils/rpc-call';
import { AdminGuard } from '@app/common/guards/admin.guard';

@Controller('resume/template')
@UseGuards(AuthGuard)
export class ResumeTemplateController implements IResumeTemplateController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllResumeTemplate(): Promise<ResumeTemplateResponseDTO[]> {
    return rpcCall<ResumeTemplateResponseDTO[]>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES,
      {},
    );
  }

  @Get('one/:id')
  async findOneResumeTemplateById(
    @Param('id', ParseUUIDPipe) resumeId: string,
  ): Promise<ResumeTemplateResponseDTO> {
    return rpcCall<ResumeTemplateResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.FIND_ONE_RESUME_TEMPLATE,
      resumeId,
    );
  }

  @Post('create')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    new UploadFileInterceptor(
      'image',
      'resume-templates',
      ALLOWED_IMAGE_MIME_TYPES,
      MAX_IMAGE_SIZE_BYTES,
    ),
  )
  async createResumeTemplate(
    @Body() createResumeTemplateDTO: CreateResumeTemplateDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO> {
    return rpcCall<CreateResumeTemplateResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE,
      { dto: createResumeTemplateDTO, image },
    );
  }

  @Get('search')
  async searchResumeTemplate(
    @Query() searchResumeTemplateDTO: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]> {
    return rpcCall<SearchResumeTemplateResponseDTO[]>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE,
      searchResumeTemplateDTO,
    );
  }
}
