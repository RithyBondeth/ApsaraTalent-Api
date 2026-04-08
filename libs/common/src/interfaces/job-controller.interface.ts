export interface IJobController {
  searchJobs(data?: any): Promise<any>;
  findAllJobs(data?: any): Promise<any>;
}

export interface IInterviewController {
  createInterview(dto?: any, req?: any): Promise<any>;
  getInterviewsByEmployee(employeeId?: any, req?: any): Promise<any>;
  getInterviewsByCompany(companyId?: any, req?: any): Promise<any>;
  updateInterviewStatus(dto?: any, req?: any): Promise<any>;
}

export interface IMatchingController {
  employeeLikes(data?: any, id?: any): Promise<any>;
  companyLikes(data?: any, id?: any): Promise<any>;
  findCurrentEmployeeLiked(data?: any, id?: any): Promise<any>;
  findCurrentCompanyLiked(data?: any, id?: any): Promise<any>;
  findCurrentEmployeeMatching(data?: any, req?: any): Promise<any>;
  findCurrentCompanyMatching(data?: any, req?: any): Promise<any>;
  findCurrentEmployeeMatchingCount(data?: any, id?: any): Promise<any>;
  findCurrentCompanyMatchingCount(data?: any, id?: any): Promise<any>;
  getAnalytics(id?: any, role?: any): Promise<any>;
}
