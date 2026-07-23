import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { UserController } from './user.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('UserController', () => {
  const client = {};
  const access = {
    assertEmployeeAccess: jest.fn(),
    assertCompanyAccess: jest.fn(),
  };
  const controller = new UserController(client as any, access as any);

  beforeEach(() => {
    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue([]);
  });

  it('forwards general user reads and current-user identity', async () => {
    await controller.findAllUsers({ skip: 2, limit: 5 });
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.FIND_ALL,
      {
        skip: 2,
        limit: 5,
      },
    );
    await controller.findOneUserById('user-1');
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.FIND_ONE_BY_ID,
      { userId: 'user-1' },
    );
    await controller.getCurrentUser({ id: 'user-1' } as any);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.GET_CURRENT_USER,
      { userId: 'user-1' },
    );
    await controller.findAllCareerScopes();
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES,
      {},
    );
  });

  it('binds push-token changes to the authenticated user', async () => {
    await controller.updatePushNotificationToken(
      { user: { id: 'user-1' } },
      { token: ' device-token ' },
    );
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN,
      { userId: 'user-1', token: ' device-token ' },
    );
    await controller.updatePushNotificationToken(
      { user: { id: 'user-1' } },
      {},
    );
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN,
      { userId: 'user-1', token: null },
    );
  });

  it('authorizes all employee favorite operations', async () => {
    const req = { user: { id: 'user-1' } };
    const favorite = { eid: 'employee-1', cid: 'company-1' };
    await controller.employeeFavoriteCompany(favorite, req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE,
      favorite,
    );
    const unfavorite = { ...favorite, favoriteId: 'favorite-1' };
    await controller.employeeUnfavoriteCompany(unfavorite, req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
      unfavorite,
    );
    await controller.findAllEmployeeFavorite({ eid: 'employee-1' }, req);
    await controller.countEmployeeFavorite({ eid: 'employee-1' }, req);
    expect(access.assertEmployeeAccess).toHaveBeenCalledTimes(4);
  });

  it('authorizes all company favorite operations', async () => {
    const req = { user: { id: 'user-1' } };
    const favorite = { cid: 'company-1', eid: 'employee-1' };
    await controller.companyFavoriteEmployee(favorite, req);
    const unfavorite = { ...favorite, favoriteId: 'favorite-1' };
    await controller.companyUnfavoriteEmployee(unfavorite, req);
    await controller.findAllCompanyFavorite({ cid: 'company-1' }, req);
    await controller.countCompanyFavorite({ cid: 'company-1' }, req);
    expect(access.assertCompanyAccess).toHaveBeenCalledTimes(4);
  });

  it('authorizes recommendations and normalizes limits', async () => {
    const req = { user: { id: 'user-1' } };
    await controller.getEmployeeRecommendations('employee-1', 7, req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS,
      { employeeId: 'employee-1', limit: 7, requesterId: 'user-1' },
    );
    await controller.getCompanyRecommendations('company-1', undefined, req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS,
      { companyId: 'company-1', limit: 10, requesterId: 'user-1' },
    );
  });
});
