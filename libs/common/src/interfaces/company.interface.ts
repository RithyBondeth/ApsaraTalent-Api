export interface IFindCompanyController {
  findAll(data?: any): Promise<any>;
  findOneById(data?: any): Promise<any>;
}

export interface IImageCompanyController {
  uploadCompanyAvatar(data?: any, file?: any): Promise<any>;
  removeCompanyAvatar(data?: any): Promise<any>;
  uploadCompanyCover(data?: any, file?: any): Promise<any>;
  removeCompanyCover(data?: any): Promise<any>;
  uploadCompanyImages(data?: any, file?: any): Promise<any>;
  removeCompanyImage(data?: any): Promise<any>;
}

export interface IUpdateCompanyInfoController {
  updateCompanyInfo(data?: any, body?: any): Promise<any>;
}

export interface ICompanyController
  extends IFindCompanyController,
    IImageCompanyController,
    IUpdateCompanyInfoController {}
