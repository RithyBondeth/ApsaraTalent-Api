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
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { rpcCall } from '../../utils/rpc-call';

@Controller('resume/template')
@UseGuards(AuthGuard)
export class ResumeTemplateController implements IResumeTemplateController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllResumeTemplate(): Promise<any> {
    return rpcCall(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES,
      {},
    );
  }

  @Get('one/:id')
  async findOneResumeTemplateById(
    @Param('id', ParseUUIDPipe) resumeId: string,
  ): Promise<any> {
    return rpcCall(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.FIND_ONE_RESUME_TEMPLATE,
      resumeId,
    );
  }

  @Post('create')
  @UseInterceptors(new UploadFileInterceptor('image', 'template-images'))
  async createResumeTemplate(
    @Body() createResumeTemplateDTO: any,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<MessageResponse> {
    return rpcCall<MessageResponse>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE,
      { createResumeTemplateDTO, image },
    );
  }

  @Get('search')
  async searchResumeTemplate(@Query() searchTemplateQuery: any): Promise<any> {
    return rpcCall(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE,
      searchTemplateQuery,
    );
  }
}
