<<<<<<< HEAD
export interface IResumeBuilderController {
    buildResume(body: any): Promise<any>;
}
=======
export interface IResumeTemplateController {
  findAllResumeTemplate(data?: any): Promise<any>;
  findOneResumeTemplateById(data?: any): Promise<any>;
  createResumeTemplate(data?: any, file?: any): Promise<any>;
}

export interface IResumeBuilderController {
  buildResume(body: any): Promise<any>;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
