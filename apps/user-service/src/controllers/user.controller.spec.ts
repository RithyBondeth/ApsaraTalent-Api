import 'reflect-metadata';
import { UserController } from './user.controller';

describe('User-service RPC controller', () => {
  it('delegates every user action to its service method', async () => {
    const mappings: Array<[string, string]> = [
      ['findAllUsers', 'findAllUsers'],
      ['findOneUserById', 'findOneUserByID'],
      ['getCurrentUser', 'findOneUserByID'],
      ['updatePushNotificationToken', 'updatePushNotificationToken'],
      ['employeeFavoriteCompany', 'employeeFavoriteCompany'],
      ['employeeUnfavoriteCompany', 'employeeUnfavoriteCompany'],
      ['companyUnfavoriteEmployee', 'companyUnfavoriteEmployee'],
      ['companyFavoriteEmployee', 'companyFavoriteEmployee'],
      ['findAllEmployeeFavorite', 'findAllEmployeeFavorites'],
      ['findAllCompanyFavorite', 'findAllCompanyFavorites'],
      ['countCompanyFavorite', 'countCompanyFavorite'],
      ['countEmployeeFavorite', 'countEmployeeFavorite'],
      ['clearUserCache', 'clearCurrentUserCache'],
      ['getEmployeeRecommendations', 'getEmployeeRecommendations'],
      ['getCompanyRecommendations', 'getCompanyRecommendations'],
    ];
    const methods = new Set(mappings.map(([, serviceMethod]) => serviceMethod));
    const service = Object.fromEntries(
      [...methods].map((method) => [method, jest.fn().mockResolvedValue({})]),
    ) as Record<string, jest.Mock>;
    service.countAllUsers = jest.fn().mockResolvedValue({ totalUsers: 1 });
    service.findAllCareerScopes = jest.fn().mockResolvedValue([]);
    const controller = new UserController(service as any);
    for (const [controllerMethod, serviceMethod] of mappings) {
      const dto = { id: 'value' } as any;
      await (controller as any)[controllerMethod](dto);
      expect(service[serviceMethod]).toHaveBeenLastCalledWith(dto);
    }
    await controller.countAllUsers();
    await controller.findAllCareerScopes();
    expect(service.countAllUsers).toHaveBeenCalled();
    expect(service.findAllCareerScopes).toHaveBeenCalled();
  });
});
