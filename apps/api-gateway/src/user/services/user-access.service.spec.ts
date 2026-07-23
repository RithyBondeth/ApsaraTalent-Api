import { ForbiddenException } from '@nestjs/common';
import { rpcCall } from '../../utils/rpc-call';
import { UserAccessService } from './user-access.service';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('UserAccessService', () => {
  const service = new UserAccessService({} as any);

  beforeEach(() => jest.clearAllMocks());

  it('allows matching employee and company owners', async () => {
    (rpcCall as jest.Mock)
      .mockResolvedValueOnce({
        role: 'employee',
        employee: { id: 'employee-1' },
      })
      .mockResolvedValueOnce({ role: 'company', company: { id: 'company-1' } });
    await expect(
      service.assertEmployeeAccess('user-1', 'employee-1'),
    ).resolves.toBeUndefined();
    await expect(
      service.assertCompanyAccess('user-2', 'company-1'),
    ).resolves.toBeUndefined();
  });

  it('rejects missing identities and profile mismatches', async () => {
    await expect(
      service.assertEmployeeAccess('', 'employee-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assertCompanyAccess('', 'company-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    (rpcCall as jest.Mock)
      .mockResolvedValueOnce({ role: 'employee', employee: { id: 'other' } })
      .mockResolvedValueOnce({ role: 'company', company: { id: 'other' } });
    await expect(
      service.assertEmployeeAccess('user-1', 'employee-1'),
    ).rejects.toThrow('employee resource');
    await expect(
      service.assertCompanyAccess('user-2', 'company-1'),
    ).rejects.toThrow('company resource');
  });
});
