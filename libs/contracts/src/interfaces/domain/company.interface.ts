import { MessageResponse } from './message-response.interface';

export interface IFindCompanyController {
  findAll(data?: any): Promise<any>;
  findOneById(data?: any): Promise<any>;
}

export interface IImageCompanyController {
  uploadCompanyAvatar(data?: any, file?: any): Promise<MessageResponse>;
  removeCompanyAvatar(data?: any): Promise<MessageResponse>;
  uploadCompanyCover(data?: any, file?: any): Promise<MessageResponse>;
  removeCompanyCover(data?: any): Promise<MessageResponse>;
  uploadCompanyImages(data?: any, file?: any): Promise<MessageResponse>;
  removeCompanyImage(data1?: any, data2?: any): Promise<MessageResponse>;
}

export interface IUpdateCompanyInfoController {
  updateCompanyInfo(data?: any, body?: any): Promise<any>;
}

export interface IOpenPositionController {
  removeOpenPosition(data?: any, body?: any): Promise<MessageResponse>;
}

export interface ICompanyController
  extends
    IFindCompanyController,
    IImageCompanyController,
    IUpdateCompanyInfoController,
    IOpenPositionController {}
