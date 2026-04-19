import { CoreResponseDTO } from '../../dtos/shared';

export interface IFindCompanyController {
  findAll(data?: any): Promise<any>;
  findOneById(data?: any): Promise<any>;
}

export interface IImageCompanyController {
  uploadCompanyAvatar(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeCompanyAvatar(data?: any): Promise<CoreResponseDTO>;
  uploadCompanyCover(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeCompanyCover(data?: any): Promise<CoreResponseDTO>;
  uploadCompanyImages(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeCompanyImage(data1?: any, data2?: any): Promise<CoreResponseDTO>;
}

export interface IUpdateCompanyInfoController {
  updateCompanyInfo(data?: any, body?: any): Promise<any>;
}

export interface IOpenPositionController {
  removeOpenPosition(data?: any, body?: any): Promise<CoreResponseDTO>;
}

export interface ICompanyController
  extends
    IFindCompanyController,
    IImageCompanyController,
    IUpdateCompanyInfoController,
    IOpenPositionController {}
