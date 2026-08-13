import 'reflect-metadata';
import { UserController } from './user.controller';

type Owner = 'user' | 'favorites' | 'recommendations';

describe('User-service RPC controller', () => {
  it('delegates every user action to the owning service', async () => {
    // [controller method, service method, which service owns it]. The owner
    // column is the point: UserService was split into three, and a delegation
    // sent to the wrong one would still "work" against a single shared mock.
    const mappings: Array<[string, string, Owner]> = [
      ['findAllUsers', 'findAllUsers', 'user'],
      ['findOneUserById', 'findOneUserByID', 'user'],
      ['getCurrentUser', 'findOneUserByID', 'user'],
      ['updatePushNotificationToken', 'updatePushNotificationToken', 'user'],
      ['clearUserCache', 'clearCurrentUserCache', 'user'],
      ['employeeFavoriteCompany', 'employeeFavoriteCompany', 'favorites'],
      ['employeeUnfavoriteCompany', 'employeeUnfavoriteCompany', 'favorites'],
      ['companyUnfavoriteEmployee', 'companyUnfavoriteEmployee', 'favorites'],
      ['companyFavoriteEmployee', 'companyFavoriteEmployee', 'favorites'],
      ['findAllEmployeeFavorite', 'findAllEmployeeFavorites', 'favorites'],
      ['findAllCompanyFavorite', 'findAllCompanyFavorites', 'favorites'],
      ['countCompanyFavorite', 'countCompanyFavorite', 'favorites'],
      ['countEmployeeFavorite', 'countEmployeeFavorite', 'favorites'],
      [
        'getEmployeeRecommendations',
        'getEmployeeRecommendations',
        'recommendations',
      ],
      [
        'getCompanyRecommendations',
        'getCompanyRecommendations',
        'recommendations',
      ],
    ];

    const services: Record<Owner, Record<string, jest.Mock>> = {
      user: {},
      favorites: {},
      recommendations: {},
    };
    for (const [, serviceMethod, owner] of mappings) {
      services[owner][serviceMethod] = jest.fn().mockResolvedValue({});
    }
    services.user.countAllUsers = jest
      .fn()
      .mockResolvedValue({ totalUsers: 1 });
    services.user.findAllCareerScopes = jest.fn().mockResolvedValue([]);

    const controller = new UserController(
      services.user as any,
      services.favorites as any,
      services.recommendations as any,
    );

    for (const [controllerMethod, serviceMethod, owner] of mappings) {
      const dto = { id: 'value' } as any;
      await (controller as any)[controllerMethod](dto);
      expect(services[owner][serviceMethod]).toHaveBeenLastCalledWith(dto);

      // No other service should have been handed this action.
      for (const other of Object.keys(services) as Owner[]) {
        if (other === owner) continue;
        expect(services[other][serviceMethod]).toBeUndefined();
      }
    }

    await controller.countAllUsers();
    await controller.findAllCareerScopes();
    expect(services.user.countAllUsers).toHaveBeenCalled();
    expect(services.user.findAllCareerScopes).toHaveBeenCalled();
  });
});
