import { ForbiddenException } from '@nestjs/common';
import { JOB_SERVICE } from '@app/contracts';
import { rpcCall } from '../../utils/rpc-call';
import { ApplicationController } from './application.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('ApplicationController', () => {
  const client = {};
  const access = {
    assertCompanyAccess: jest.fn(),
    getCurrentUserProfile: jest.fn(),
  };
  const controller = new ApplicationController(client as any, access as any);

  beforeEach(() => {
    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue({ message: 'ok' });
  });

  it('requires authentication for employee-owned actions', async () => {
    await expect(controller.applyApplication({} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(controller.getMyApplications()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.withdrawApplication('application-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('binds application actions to the authenticated employee', async () => {
    const req = { user: { id: 'employee-1' } };
    const dto = { jobId: 'job-1' } as any;
    await controller.applyApplication(dto, req);
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.APPLY_JOB,
      {
        employeeId: 'employee-1',
        applyApplicationDTO: dto,
      },
    );
    await controller.getMyApplications(req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS,
      { employeeId: 'employee-1' },
    );
    await controller.withdrawApplication('application-1', req);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      JOB_SERVICE.ACTIONS.WITHDRAW_APPLICATION,
      { employeeId: 'employee-1', applicationId: 'application-1' },
    );
  });

  it('checks company ownership before listing and updating applications', async () => {
    await controller.getJobApplications('job-1', 'company-1', {
      user: { id: 'owner-1' },
    });
    expect(access.assertCompanyAccess).toHaveBeenCalledWith(
      'owner-1',
      'company-1',
    );
    access.getCurrentUserProfile.mockResolvedValue({
      role: 'company',
      company: { id: 'company-1' },
    });
    const dto = { applicationId: 'application-1', status: 'accepted' } as any;
    await controller.updateApplicationStatus(dto, { user: { id: 'owner-1' } });
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      JOB_SERVICE.ACTIONS.UPDATE_APPLICATION_STATUS,
      { companyId: 'company-1', updateApplicationStatusDTO: dto },
    );
  });

  it('rejects application status changes from non-company profiles', async () => {
    access.getCurrentUserProfile.mockResolvedValue({ role: 'employee' });
    await expect(
      controller.updateApplicationStatus({} as any, { user: { id: 'user-1' } }),
    ).rejects.toThrow('Only companies can update application status.');
  });
});
