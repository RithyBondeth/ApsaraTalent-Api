import { AuthGuard } from '@app/common/guards/auth.guard';
import { IResumeTemplateController } from '@app/contracts/interfaces/controller/resume-controller.interface';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
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
  @UseInterceptors(new UploadFileInterceptor('image', 'template-images'))
  async createResumeTemplate(
    @Body() dto: CreateResumeTemplateDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<CreateResumeTemplateResponseDTO> {
    return rpcCall<CreateResumeTemplateResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE,
      { dto, image },
    );
  }

  @Get('search')
  async searchResumeTemplate(
    @Query() dto: SearchResumeTemplateDTO,
  ): Promise<SearchResumeTemplateResponseDTO[]> {
    return rpcCall<SearchResumeTemplateResponseDTO[]>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE,
      dto,
    );
  }
}
