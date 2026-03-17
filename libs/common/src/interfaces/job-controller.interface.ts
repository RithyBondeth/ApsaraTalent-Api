export interface IJobController {
  searchJobs(data?: any): Promise<any>;
  findAllJobs(data?: any): Promise<any>;
}

export interface IMatchingController {
  employeeLikes(data?: any, id?: any): Promise<any>;
  companyLikes(data?: any, id?: any): Promise<any>;
  findCurrentEmployeeLiked(data?: any, id?: any): Promise<any>;
  findCurrentCompanyLiked(data?: any, id?: any): Promise<any>;
  findCurrentEmployeeMatchingCount(data?: any, id?: any): Promise<any>;
  findCurrentCompanyMatchingCount(data?: any, id?: any): Promise<any>;
}
