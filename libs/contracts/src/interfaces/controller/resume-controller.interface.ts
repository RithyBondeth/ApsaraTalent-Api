import { MessageResponse } from '../domain/message-response.interface';

export interface IResumeTemplateController {
  findAllResumeTemplate(data?: any): Promise<any>;
  findOneResumeTemplateById(data?: any): Promise<any>;
  createResumeTemplate(data?: any, file?: any): Promise<MessageResponse>;
  searchResumeTemplate(data?: any): Promise<any>;
}

export interface IResumeBuilderController {
  buildResume(body: any): Promise<any>;
}
