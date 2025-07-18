import { IResumeTemplateController } from '@app/common/interfaces/resume-controller.interface';
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
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';

@Controller('resume/template')
export class ResumeTemplateController implements IResumeTemplateController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllResumeTemplate(): Promise<any> {
    return firstValueFrom(
      this.resumeBuilderClient.send(
        RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES,
        {},
      ),
    );
  }

  @Get('one/:id')
  async findOneResumeTemplateById(
    @Param('id', ParseUUIDPipe) resumeId: string,
  ): Promise<any> {
    return firstValueFrom(
      this.resumeBuilderClient.send(
        RESUME_BUILDER_SERVICE.ACTIONS.FIND_ONE_RESUME_TEMPLATE,
        resumeId,
      ),
    );
  }

  @Post('create')
  @UseInterceptors(new UploadFileInterceptor('image', 'template-images'))
  async createResumeTemplate(
    @Body() createResumeTemplateDTO: any,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<any> {
    const payload = { createResumeTemplateDTO, image };
    return firstValueFrom(
      this.resumeBuilderClient.send(
        RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE,
        payload,
      ),
    );
  }

  @Get('search')
  async searchResumeTemplate(@Query() searchTemplateQuery: any): Promise<any> {
    return firstValueFrom(
      this.resumeBuilderClient.send(
        RESUME_BUILDER_SERVICE.ACTIONS.SEARCH_RESUME_TEMPLATE,
        searchTemplateQuery,
      ),
    );
  }
}
