export interface IJobController {
    searchJobs(data?: any): Promise<any>;
    findAllJobs(data?: any): Promise<any>;
}

export interface IMatchingController {
    employeeLikes(empId: string, cmpId: string): Promise<any>;
    companyLikes(cmpId: string, empId: string): Promise<any>;
}
