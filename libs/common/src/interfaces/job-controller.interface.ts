export interface IJobController {
    searchJobs(data?: any): Promise<any>;
    findAllJobs(data?: any): Promise<any>;
}

export interface IMatchingController {
    employeeLikes(data?: any): Promise<any>;
    companyLikes(data?: any): Promise<any>;
}
