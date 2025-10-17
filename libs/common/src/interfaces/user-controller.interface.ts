export interface IUserController {
    findAllUsers(): Promise<any>;
    findOneUserById(data?: any): Promise<any>;
    getCurrentUser(data?: any): Promise<any>;
    findAllCareerScopes(data?: any): Promise<any>;
}