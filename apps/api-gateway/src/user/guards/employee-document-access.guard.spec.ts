import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EmployeeDocumentAccessGuard } from './employee-document-access.guard';
import { UserAccessService } from '../services/user-access.service';

function context(userId: string, employeeId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: userId }, params: { employeeId } }),
    }),
  } as ExecutionContext;
}

describe('EmployeeDocumentAccessGuard', () => {
  const userAccessService = {
    getCurrentUserProfile: jest.fn(),
  } as unknown as jest.Mocked<UserAccessService>;
  const guard = new EmployeeDocumentAccessGuard(userAccessService);

  beforeEach(() => jest.clearAllMocks());

  it('allows an employee to access their own document', async () => {
    userAccessService.getCurrentUserProfile.mockResolvedValueOnce({
      role: 'employee',
      employee: { id: 'employee-1' },
    } as any);

    await expect(
      guard.canActivate(context('user-1', 'employee-1')),
    ).resolves.toBe(true);
  });

  it('allows an authenticated company to access candidate documents', async () => {
    userAccessService.getCurrentUserProfile.mockResolvedValueOnce({
      role: 'company',
      company: { id: 'company-1' },
    } as any);

    await expect(
      guard.canActivate(context('user-2', 'employee-1')),
    ).resolves.toBe(true);
  });

  it('rejects another employee', async () => {
    userAccessService.getCurrentUserProfile.mockResolvedValueOnce({
      role: 'employee',
      employee: { id: 'employee-2' },
    } as any);

    await expect(
      guard.canActivate(context('user-2', 'employee-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
