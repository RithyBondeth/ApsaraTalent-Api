import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { RpcException } from '@nestjs/microservices';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  const applications = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const jobs = { findOne: jest.fn() };
  const employees = { findOne: jest.fn() };
  const matches = { find: jest.fn() };
  const notifications = { emit: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const service = new ApplicationService(
    applications as any,
    jobs as any,
    employees as any,
    matches as any,
    notifications as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    applications.save.mockImplementation(async (value) => value);
    applications.update.mockResolvedValue({ affected: 1 });
    matches.find.mockResolvedValue([]);
  });

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  it('rejects an application when the employee profile is missing', async () => {
    employees.findOne.mockResolvedValue(null);
    await expectRpc(
      service.applyApplication('user-1', { jobId: 'job-1' }),
      404,
      'Employee not found',
    );
  });

  it('rejects an application for a missing job', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue(null);
    await expectRpc(
      service.applyApplication('user-1', { jobId: 'job-1' }),
      404,
      'Job not found',
    );
  });

  it('prevents duplicate applications', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue({ id: 'job-1' });
    applications.findOne.mockResolvedValue({
      id: 'existing',
      status: EApplicationStatus.SHORTLISTED,
    });
    await expectRpc(
      service.applyApplication('user-1', { jobId: 'job-1' }),
      409,
      'You have already applied to this job',
    );
  });

  it('lets a withdrawn candidate re-apply by reviving the existing row', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    const withdrawn = {
      id: 'application-1',
      status: EApplicationStatus.WITHDRAWN,
      rejectionReason: 'Not a fit',
      reviewedAt: new Date('2026-01-01'),
      appliedAt: new Date('2026-01-01'),
    };
    applications.findOne.mockResolvedValue(withdrawn);

    const result = await service.applyApplication('user-1', {
      jobId: 'job-1',
      coverLetterNote: 'Trying again',
    });

    expect(applications.create).not.toHaveBeenCalled();
    expect(withdrawn.status).toBe(EApplicationStatus.PENDING);
    expect(withdrawn.rejectionReason).toBeNull();
    expect(withdrawn.reviewedAt).toBeNull();
    expect(result.id).toBe('application-1');
  });

  it('creates a pending application with its optional cover letter', async () => {
    const employee = { id: 'employee-1' };
    const job = { id: 'job-1', title: 'Engineer' };
    employees.findOne.mockResolvedValue(employee);
    jobs.findOne.mockResolvedValue(job);
    applications.findOne.mockResolvedValue(null);
    applications.save.mockImplementation(async (value) => ({
      id: 'application-1',
      appliedAt: new Date('2026-01-01'),
      ...value,
    }));

    const result = await service.applyApplication('user-1', {
      jobId: 'job-1',
      coverLetterNote: 'Hello',
    });

    expect(applications.create).toHaveBeenCalledWith({
      employee,
      job,
      status: EApplicationStatus.PENDING,
      coverLetterNote: 'Hello',
      rejectionReason: null,
      reviewedAt: null,
      statusChangedAt: null,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'application-1',
        jobId: 'job-1',
        employeeId: 'employee-1',
      }),
    );
  });

  it('tells the company an application arrived', async () => {
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      username: 'Applicant',
    });
    jobs.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Engineer',
      company: { id: 'company-1', user: { id: 'company-user' } },
    });
    applications.findOne.mockResolvedValue(null);

    await service.applyApplication('user-1', { jobId: 'job-1' });

    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'company-user',
        type: 'application',
        data: expect.objectContaining({ eventType: 'application_received' }),
      }),
    );
  });

  it('returns the signed-in employee applications newest first', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        job: { id: 'job-1', title: 'Engineer' },
      },
    ]);

    const result = await service.getMyApplications('user-1');

    expect(applications.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { employee: { id: 'employee-1' } },
        order: { appliedAt: 'DESC' },
      }),
    );
    expect(result[0]).toEqual(
      expect.objectContaining({ jobId: 'job-1', jobTitle: 'Engineer' }),
    );
  });

  it('does not expose job applications to a different company', async () => {
    jobs.findOne.mockResolvedValue(null);
    await expectRpc(
      service.getJobApplications('job-1', 'other-company'),
      404,
      'Job not found or access denied',
    );
    expect(applications.find).not.toHaveBeenCalled();
  });

  it('returns applicants to the company that owns the job', async () => {
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: new Date('2026-01-01'),
        employee: { id: 'employee-1', username: 'Applicant' },
      },
    ]);

    const result = await service.getJobApplications('job-1', 'company-1');
    expect(result[0]).toEqual(
      expect.objectContaining({
        employeeId: 'employee-1',
        employeeName: 'Applicant',
      }),
    );
  });

  it('scores the applicant list from the matching table', async () => {
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: new Date('2026-01-01'),
        employee: { id: 'employee-1' },
      },
      {
        id: 'application-2',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: new Date('2026-01-01'),
        employee: { id: 'employee-2' },
      },
    ]);
    matches.find.mockResolvedValue([
      { id: 'match-1', matchScore: 82, employee: { id: 'employee-1' } },
    ]);

    const result = await service.getJobApplications('job-1', 'company-1');

    expect(result[0].matchScore).toBe(82);
    // An applicant who never swiped has no pair to score, and reads as null
    // rather than as a zero that would sort them below a genuine bad fit.
    expect(result[1].matchScore).toBeNull();
  });

  it('still returns applicants when scoring fails', async () => {
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: new Date('2026-01-01'),
        employee: { id: 'employee-1' },
      },
    ]);
    matches.find.mockRejectedValueOnce(new Error('scores unavailable'));

    const result = await service.getJobApplications('job-1', 'company-1');
    expect(result).toHaveLength(1);
    expect(result[0].matchScore).toBeNull();
  });

  it('stamps reviewedAt the first time the company opens the list', async () => {
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: null,
        employee: { id: 'employee-1' },
      },
      {
        id: 'application-2',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: new Date('2026-01-01'),
        employee: { id: 'employee-2' },
      },
    ]);

    const result = await service.getJobApplications('job-1', 'company-1');

    // Only the unreviewed row is touched, and the already-stamped one keeps
    // the date it had.
    expect(applications.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
      expect.objectContaining({ reviewedAt: expect.any(Date) }),
    );
    expect(result[0].reviewedAt).toBeInstanceOf(Date);
    expect(result[1].reviewedAt).toEqual(new Date('2026-01-01'));
  });

  it('still returns the applicant list when stamping fails', async () => {
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.find.mockResolvedValue([
      {
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        reviewedAt: null,
        employee: { id: 'employee-1' },
      },
    ]);
    applications.update.mockRejectedValueOnce(new Error('stamp failed'));

    const result = await service.getJobApplications('job-1', 'company-1');
    expect(result).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('blocks a different company from updating application status', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      job: { company: { id: 'owner-company' } },
    });
    await expectRpc(
      service.updateApplicationStatus('other-company', {
        applicationId: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
      }),
      404,
      'Application not found or access denied',
    );
  });

  it('allows the owning company to update application status', async () => {
    const application = {
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      reviewedAt: null,
      job: {
        id: 'job-1',
        title: 'Engineer',
        company: { id: 'company-1' },
      },
      employee: { id: 'employee-1', username: 'Applicant' },
    };
    applications.findOne.mockResolvedValue(application);

    const result = await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
    });

    expect(application.status).toBe(EApplicationStatus.SHORTLISTED);
    expect(application.reviewedAt).toBeInstanceOf(Date);
    expect(result).toEqual(
      expect.objectContaining({ status: EApplicationStatus.SHORTLISTED }),
    );
  });

  it('refuses a move the pipeline does not allow', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      job: { id: 'job-1', company: { id: 'company-1' } },
      employee: { id: 'employee-1' },
    });

    await expectRpc(
      service.updateApplicationStatus('company-1', {
        applicationId: 'application-1',
        status: EApplicationStatus.HIRED,
      }),
      400,
      'Cannot move an application from "pending" to "hired".',
    );
  });

  it('refuses to move a rejected application back into the pipeline', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.REJECTED,
      job: { id: 'job-1', company: { id: 'company-1' } },
      employee: { id: 'employee-1' },
    });

    await expectRpc(
      service.updateApplicationStatus('company-1', {
        applicationId: 'application-1',
        status: EApplicationStatus.PENDING,
      }),
      400,
      'Cannot move an application from "rejected" to "pending".',
    );
  });

  it('keeps a rejection reason only on a rejection', async () => {
    const rejected = {
      id: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
    };
    applications.findOne.mockResolvedValue(rejected);

    const result = await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.REJECTED,
      rejectionReason: 'Looking for more Go experience',
    });

    expect(result.rejectionReason).toBe('Looking for more Go experience');

    // The same reason must not survive a move that is not a rejection.
    const advancing = {
      id: 'application-2',
      status: EApplicationStatus.SHORTLISTED,
      appliedAt: new Date(),
      rejectionReason: 'stale',
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1' },
    };
    applications.findOne.mockResolvedValue(advancing);

    const advanced = await service.updateApplicationStatus('company-1', {
      applicationId: 'application-2',
      status: EApplicationStatus.INTERVIEWING,
      rejectionReason: 'should be ignored',
    });
    expect(advanced.rejectionReason).toBeNull();
  });

  it('notifies the candidate when their application moves', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
    });

    await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
    });

    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'employee-user',
        title: 'You have been shortlisted',
        data: expect.objectContaining({
          eventType: 'application_shortlisted',
        }),
      }),
    );
  });

  it('withdraws by marking the row rather than deleting it', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    const application = {
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
    };
    applications.findOne.mockResolvedValue(application);

    await expect(
      service.withdrawApplication('user-1', 'application-1'),
    ).resolves.toEqual({ message: 'Application withdrawn successfully' });

    expect(applications.delete).not.toHaveBeenCalled();
    expect(application.status).toBe(EApplicationStatus.WITHDRAWN);
  });

  it('lets a candidate withdraw after being shortlisted', async () => {
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      username: 'Applicant',
    });
    const application = {
      id: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
      job: {
        id: 'job-1',
        title: 'Engineer',
        company: { id: 'company-1', user: { id: 'company-user' } },
      },
    };
    applications.findOne.mockResolvedValue(application);

    await service.withdrawApplication('user-1', 'application-1');

    expect(application.status).toBe(EApplicationStatus.WITHDRAWN);
    // The company had started working this candidate, so they are told.
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'company-user',
        data: expect.objectContaining({
          eventType: 'application_withdrawn',
          withdrawnFrom: EApplicationStatus.SHORTLISTED,
        }),
      }),
    );
  });

  it('does not notify a company about a withdrawal it never looked at', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      job: {
        id: 'job-1',
        title: 'Engineer',
        company: { id: 'company-1', user: { id: 'company-user' } },
      },
    });

    await service.withdrawApplication('user-1', 'application-1');
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('prevents withdrawal once the application has closed', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.HIRED,
    });
    await expectRpc(
      service.withdrawApplication('user-1', 'application-1'),
      400,
      'This application has already been closed',
    );
  });

  it('wraps unexpected database failures as internal RPC errors', async () => {
    employees.findOne.mockRejectedValue(new Error('database unavailable'));
    await expectRpc(
      service.applyApplication('user-1', { jobId: 'job-1' }),
      500,
      'database unavailable',
    );
  });

  it('stores a missing cover letter as null', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });
    applications.findOne.mockResolvedValue(null);
    await service.applyApplication('user-1', { jobId: 'job-1' });
    expect(applications.create).toHaveBeenCalledWith(
      expect.objectContaining({ coverLetterNote: null }),
    );
  });

  it('handles missing employee and database failures in my applications', async () => {
    employees.findOne.mockResolvedValueOnce(null);
    await expectRpc(
      service.getMyApplications('user-1'),
      404,
      'Employee not found',
    );
    employees.findOne.mockRejectedValueOnce(new Error('lookup failed'));
    await expectRpc(service.getMyApplications('user-1'), 500, 'lookup failed');
  });

  it('wraps job-application lookup failures', async () => {
    jobs.findOne.mockRejectedValueOnce(new Error('job lookup failed'));
    await expectRpc(
      service.getJobApplications('job-1', 'company-1'),
      500,
      'job lookup failed',
    );
  });

  it('wraps application status persistence failures', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      job: { company: { id: 'company-1' } },
    });
    applications.save.mockRejectedValueOnce(new Error('status write failed'));
    await expectRpc(
      service.updateApplicationStatus('company-1', {
        applicationId: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
      }),
      500,
      'status write failed',
    );
  });

  it('rejects withdrawal for missing employee or missing application', async () => {
    employees.findOne.mockResolvedValueOnce(null);
    await expectRpc(
      service.withdrawApplication('user-1', 'application-1'),
      404,
      'Employee not found',
    );

    employees.findOne.mockResolvedValueOnce({ id: 'employee-1' });
    applications.findOne.mockResolvedValueOnce(null);
    await expectRpc(
      service.withdrawApplication('user-1', 'missing'),
      404,
      'Application not found or access denied',
    );
  });

  it('wraps withdrawal write failures', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
    });
    applications.save.mockRejectedValueOnce(new Error('withdraw failed'));
    await expectRpc(
      service.withdrawApplication('user-1', 'application-1'),
      500,
      'withdraw failed',
    );
  });
});
