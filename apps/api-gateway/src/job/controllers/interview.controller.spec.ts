import { ForbiddenException } from '@nestjs/common';
import { JOB_SERVICE } from '@app/contracts';
import { rpcCall } from '../../utils/rpc-call';
import { InterviewController } from './interview.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('InterviewController', () => {
  const client = {};
  const broadcast = { emitToUser: jest.fn() };
  const access = {
    assertCompanyAccess: jest.fn(),
    assertEmployeeAccess: jest.fn(),
    getCurrentUserProfile: jest.fn(),
  };
  const controller = new InterviewController(
    client as any,
    broadcast as any,
    access as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue({ notifyUserId: 'employee-user' });
  });

  it('creates company interviews and emits both notification events', async () => {
    const dto = { companyId: 'company-1', employeeId: 'employee-1' } as any;
    await controller.createInterview(dto, { user: { id: 'owner-1' } });
    expect(access.assertCompanyAccess).toHaveBeenCalledWith(
      'owner-1',
      'company-1',
    );
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.CREATE_INTERVIEW,
      {
        ...dto,
        createdBy: 'company',
      },
    );
    expect(broadcast.emitToUser).toHaveBeenCalledTimes(2);
  });

  it('checks profile ownership before returning interview lists', async () => {
    await controller.getInterviewsByEmployee('employee-1', {
      user: { id: 'user-1' },
    });
    expect(access.assertEmployeeAccess).toHaveBeenCalledWith(
      'user-1',
      'employee-1',
    );
    await controller.getInterviewsByCompany('company-1', {
      user: { id: 'user-2' },
    });
    expect(access.assertCompanyAccess).toHaveBeenCalledWith(
      'user-2',
      'company-1',
    );
  });

  it('adds the authenticated role to status updates', async () => {
    access.getCurrentUserProfile.mockResolvedValue({ role: 'employee' });
    const dto = { interviewId: 'interview-1', status: 'accepted' } as any;
    await controller.updateInterviewStatus(dto, { user: { id: 'user-1' } });
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS,
      { ...dto, requestUserId: 'user-1', requestUserRole: 'employee' },
    );
  });

  it('rejects missing users and invalid profile roles', async () => {
    await expect(
      controller.updateInterviewStatus({} as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    access.getCurrentUserProfile.mockResolvedValue({ role: 'admin' });
    await expect(
      controller.updateInterviewStatus({} as any, { user: { id: 'user-1' } }),
    ).rejects.toThrow('Invalid user role.');
  });
});
