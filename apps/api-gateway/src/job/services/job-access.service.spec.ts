import { ForbiddenException } from '@nestjs/common';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { JobAccessService } from './job-access.service';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('JobAccessService', () => {
  const client = {};
  const service = new JobAccessService(client as any);

  beforeEach(() => jest.clearAllMocks());

  it('loads the authenticated user profile', async () => {
    (rpcCall as jest.Mock).mockResolvedValue({ id: 'user-1' });
    await service.getCurrentUserProfile('user-1');
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      USER_SERVICE.ACTIONS.GET_CURRENT_USER,
      { userId: 'user-1' },
    );
  });

  it('allows only the matching employee and company profiles', async () => {
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

  it('rejects unauthenticated and mismatched profiles', async () => {
    await expect(
      service.assertEmployeeAccess('', 'employee-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assertCompanyAccess('', 'company-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    (rpcCall as jest.Mock)
      .mockResolvedValueOnce({ role: 'company', company: { id: 'company-1' } })
      .mockResolvedValueOnce({
        role: 'employee',
        employee: { id: 'employee-1' },
      });
    await expect(
      service.assertEmployeeAccess('user-1', 'employee-1'),
    ).rejects.toThrow('employee resource');
    await expect(
      service.assertCompanyAccess('user-2', 'company-1'),
    ).rejects.toThrow('company resource');
  });

  it('allows either side of a match and rejects outsiders', async () => {
    (rpcCall as jest.Mock)
      .mockResolvedValueOnce({
        role: 'employee',
        employee: { id: 'employee-1' },
      })
      .mockResolvedValueOnce({ role: 'company', company: { id: 'company-1' } })
      .mockResolvedValueOnce({ role: 'employee', employee: { id: 'other' } });
    await expect(
      service.assertMatchParticipantAccess(
        'employee-user',
        'employee-1',
        'company-1',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.assertMatchParticipantAccess(
        'company-user',
        'employee-1',
        'company-1',
      ),
    ).resolves.toBeUndefined();
    await expect(
      service.assertMatchParticipantAccess(
        'outsider',
        'employee-1',
        'company-1',
      ),
    ).rejects.toThrow('permission');
    await expect(
      service.assertMatchParticipantAccess('', 'employee-1', 'company-1'),
    ).rejects.toThrow('Unauthorized');
  });
});
