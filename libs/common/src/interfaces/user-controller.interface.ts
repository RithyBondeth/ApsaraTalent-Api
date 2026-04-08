export interface IUserController {
  findAllUsers(data?: any): Promise<any>;
  findOneUserById(data?: any): Promise<any>;
  getCurrentUser(data?: any): Promise<any>;
  findAllCareerScopes(data?: any): Promise<any>;
  employeeFavoriteCompany(eid?: any, cid?: any): Promise<any>;
  employeeUnfavoriteCompany(
    eid?: any,
    cid?: any,
    favoriteId?: string,
  ): Promise<any>;
  companyFavoriteEmployee(cid?: any, eid?: any): Promise<any>;
  companyUnfavoriteEmployee(
    cid?: any,
    eid?: any,
    favoriteId?: string,
  ): Promise<any>;
  findAllEmployeeFavorite(eid?: any): Promise<any>;
  findAllCompanyFavorite(cid?: any): Promise<any>;
  countEmployeeFavorite(eid?: any): Promise<any>;
  countCompanyFavorite(cid?: any): Promise<any>;
  updatePushNotificationToken?(...args: any[]): Promise<any>;
  getEmployeeRecommendations(
    employeeId?: any,
    limit?: any,
    req?: any,
  ): Promise<any>;
  getCompanyRecommendations(
    companyId?: any,
    limit?: any,
    req?: any,
  ): Promise<any>;
}
