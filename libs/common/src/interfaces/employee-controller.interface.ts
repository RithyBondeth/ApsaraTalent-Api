export interface IFindEmployeeController {
  findAll(data?: any): Promise<any>;
  findOneById(data?: any): Promise<any>;
}

export interface IImageEmployeeController {
  uploadEmployeeAvatar(data?: any, file?: any): Promise<any>;
  removeEmployeeAvatar(data?: any, file?: any): Promise<any>;
}

export interface ISearchEmployeeController {
  searchEmployee(data?: any): Promise<any>;
}

export interface IUpdateEmployeeController {
  updateEmployeeInfo(data?: any, body?: any): Promise<any>;
}

export interface IUploadEmployeeController {
  uploadEmployeeResume(data?: any, file?: any): Promise<any>;
  removeEmployeeResume(data?: any): Promise<any>;
  uploadEmployeeCoverLetter(data?: any, file?: any): Promise<any>;
  removeEmployeeCoverLetter(data?: any): Promise<any>;
}

export interface IEmployeeController
  extends IFindEmployeeController,
    IImageEmployeeController,
    ISearchEmployeeController,
    IUpdateEmployeeController,
    IUploadEmployeeController {}
