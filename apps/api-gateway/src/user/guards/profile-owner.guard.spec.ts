import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CompanyProfileOwnerGuard } from './company-profile-owner.guard';
import { EmployeeProfileOwnerGuard } from './employee-profile-owner.guard';
import { UserAccessService } from '../services/user-access.service';

function httpContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('profile owner guards', () => {
  const userAccessService = {
    assertEmployeeAccess: jest.fn(),
    assertCompanyAccess: jest.fn(),
  } as unknown as jest.Mocked<UserAccessService>;

  beforeEach(() => jest.clearAllMocks());

  it('authorizes an employee profile using the authenticated user and route id', async () => {
    const guard = new EmployeeProfileOwnerGuard(userAccessService);
    const context = httpContext({
      user: { id: 'user-1' },
      params: { employeeId: 'employee-1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(userAccessService.assertEmployeeAccess).toHaveBeenCalledWith(
      'user-1',
      'employee-1',
    );
  });

  it('rejects an employee profile when the ownership check fails', async () => {
    userAccessService.assertEmployeeAccess.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    const guard = new EmployeeProfileOwnerGuard(userAccessService);

    await expect(
      guard.canActivate(
        httpContext({
          user: { id: 'user-1' },
          params: { employeeId: 'employee-2' },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('authorizes a company profile using the authenticated user and route id', async () => {
    const guard = new CompanyProfileOwnerGuard(userAccessService);
    const context = httpContext({
      user: { id: 'user-1' },
      params: { companyId: 'company-1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(userAccessService.assertCompanyAccess).toHaveBeenCalledWith(
      'user-1',
      'company-1',
    );
  });

  it('rejects a company profile when the ownership check fails', async () => {
    userAccessService.assertCompanyAccess.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    const guard = new CompanyProfileOwnerGuard(userAccessService);

    await expect(
      guard.canActivate(
        httpContext({
          user: { id: 'user-1' },
          params: { companyId: 'company-2' },
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
