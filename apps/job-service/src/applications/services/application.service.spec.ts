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
  const notes = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    remove: jest.fn(),
  };
  const history = {
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
  };
  const jobs = { findOne: jest.fn() };
  const employees = { findOne: jest.fn() };
  const matches = { find: jest.fn() };
  const notifications = { emit: jest.fn() };
  const matchLink = { recordInterest: jest.fn() };
  const analytics = { capture: jest.fn(), identify: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn(), warn: jest.fn() };
  const service = new ApplicationService(
    applications as any,
    notes as any,
    history as any,
    jobs as any,
    employees as any,
    matches as any,
    notifications as any,
    analytics as any,
    matchLink as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    applications.save.mockImplementation(async (value) => value);
    applications.update.mockResolvedValue({ affected: 1 });
    matches.find.mockResolvedValue([]);
    matchLink.recordInterest.mockResolvedValue({ becameMatched: false });
    notes.save.mockImplementation(async (value) => value);
    history.save.mockImplementation(async (value) => value);
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

  it('records the applicant as having liked the company', async () => {
    /*
      Applying is a like aimed at a role. Without this the application would sit
      outside the matching loop entirely, which is what let it become a second
      door into contact.
    */
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Engineer',
      company: { id: 'company-1' },
    });
    applications.findOne.mockResolvedValue(null);

    await service.applyApplication('user-1', { jobId: 'job-1' });

    expect(matchLink.recordInterest).toHaveBeenCalledWith(
      'employee-1',
      'company-1',
      'employee',
    );
  });

  it('still creates the application when the match link fails', async () => {
    // The candidate asked for the application; a scoring or cache failure
    // must not cost them it. Shortlisting records the same interest again.
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    jobs.findOne.mockResolvedValue({
      id: 'job-1',
      title: 'Engineer',
      company: { id: 'company-1' },
    });
    applications.findOne.mockResolvedValue(null);
    matchLink.recordInterest.mockRejectedValueOnce(new Error('redis down'));

    const result = await service.applyApplication('user-1', { jobId: 'job-1' });
    expect(result.status).toBe(EApplicationStatus.PENDING);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('creates the match when the company shortlists', async () => {
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

    expect(matchLink.recordInterest).toHaveBeenCalledWith(
      'employee-1',
      'company-1',
      'company',
    );
  });

  it('does not move the stage when the match could not be written', async () => {
    /*
      Ordered so the link runs first and is allowed to throw: a shortlist whose
      match failed would read as progress while leaving the two sides unable to
      speak.
    */
    const application = {
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1' },
    };
    applications.findOne.mockResolvedValue(application);
    matchLink.recordInterest.mockRejectedValueOnce(new Error('link failed'));

    await expectRpc(
      service.updateApplicationStatus('company-1', {
        applicationId: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
      }),
      500,
      'link failed',
    );
    expect(application.status).toBe(EApplicationStatus.PENDING);
    expect(applications.save).not.toHaveBeenCalled();
  });

  it('does not create a match for stages other than shortlisted', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1' },
    });

    await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.REJECTED,
      rejectionReason: 'Not a fit',
    });

    // Rejecting a cold applicant must never put them in contact.
    expect(matchLink.recordInterest).not.toHaveBeenCalled();
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
      employee: { id: 'employee-1' },
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

  it('writes a history row on apply, on stage change, and on withdraw', async () => {
    // Apply
    employees.findOne.mockResolvedValueOnce({ id: 'employee-1' });
    jobs.findOne.mockResolvedValueOnce({ id: 'job-1', title: 'Engineer' });
    applications.findOne.mockResolvedValueOnce(null);
    applications.save.mockImplementationOnce(async (value) => ({
      id: 'application-1',
      appliedAt: new Date(),
      ...value,
    }));
    await service.applyApplication('user-1', { jobId: 'job-1' });
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({
        from: null,
        to: EApplicationStatus.PENDING,
      }),
    );

    // Stage change
    history.save.mockClear();
    applications.findOne.mockResolvedValueOnce({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      job: {
        id: 'job-1',
        title: 'Engineer',
        company: { id: 'company-1', user: { id: 'company-user' } },
      },
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
    });
    await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
    });
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({
        from: EApplicationStatus.PENDING,
        to: EApplicationStatus.SHORTLISTED,
      }),
    );

    // Withdraw
    history.save.mockClear();
    employees.findOne.mockResolvedValueOnce({ id: 'employee-1' });
    applications.findOne.mockResolvedValueOnce({
      id: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
    });
    await service.withdrawApplication('user-1', 'application-1');
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({
        from: EApplicationStatus.SHORTLISTED,
        to: EApplicationStatus.WITHDRAWN,
      }),
    );
  });

  it('carries the rejection reason onto the history row', async () => {
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
    });

    await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.REJECTED,
      rejectionReason: 'Not a match',
    });

    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({
        from: EApplicationStatus.SHORTLISTED,
        to: EApplicationStatus.REJECTED,
        note: 'Not a match',
      }),
    );
  });

  it('does not abort a stage change when history logging fails', async () => {
    // The trail is best-effort; a missed row must not roll back a real move.
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
      appliedAt: new Date(),
      job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
      employee: { id: 'employee-1', user: { id: 'employee-user' } },
    });
    history.save.mockRejectedValueOnce(new Error('history down'));

    const result = await service.updateApplicationStatus('company-1', {
      applicationId: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
    });
    expect(result.status).toBe(EApplicationStatus.SHORTLISTED);
    expect(logger.warn).toHaveBeenCalled();
  });

  describe('bulkUpdateApplicationStatus', () => {
    it('reports per-row success and failure without aborting the batch', async () => {
      // First: PENDING → SHORTLISTED, allowed.
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
        employee: { id: 'employee-1', user: { id: 'employee-user' } },
      });
      // Second: HIRED → SHORTLISTED, refused by the state machine.
      applications.findOne.mockResolvedValueOnce({
        id: 'application-2',
        status: EApplicationStatus.HIRED,
        appliedAt: new Date(),
        job: { id: 'job-1', title: 'Engineer', company: { id: 'company-1' } },
        employee: { id: 'employee-2', user: { id: 'employee-user-2' } },
      });
      // Status re-read after the second failure (for the "unchanged status"
      // field on the result row).
      applications.findOne.mockResolvedValueOnce({
        id: 'application-2',
        status: EApplicationStatus.HIRED,
      });

      const result = await service.bulkUpdateApplicationStatus('company-1', {
        applicationIds: ['application-1', 'application-2'],
        status: EApplicationStatus.SHORTLISTED,
      });

      expect(result.updatedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          applicationId: 'application-1',
          ok: true,
          status: EApplicationStatus.SHORTLISTED,
        }),
      );
      expect(result.results[1]).toEqual(
        expect.objectContaining({
          applicationId: 'application-2',
          ok: false,
          status: EApplicationStatus.HIRED,
        }),
      );
      expect(result.results[1].reason).toContain('Cannot move');
    });

    it('rejects an application the caller does not own without aborting the rest', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        status: EApplicationStatus.PENDING,
        appliedAt: new Date(),
        job: { id: 'job-1', company: { id: 'other-company' } },
        employee: { id: 'employee-1' },
      });
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        status: EApplicationStatus.PENDING,
      });

      const result = await service.bulkUpdateApplicationStatus('company-1', {
        applicationIds: ['application-1'],
        status: EApplicationStatus.SHORTLISTED,
      });

      expect(result.updatedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.results[0].reason).toBe(
        'Application not found or access denied',
      );
    });
  });

  describe('notes', () => {
    it('refuses to create a note on an application the caller does not own', async () => {
      applications.findOne.mockResolvedValue({
        id: 'application-1',
        job: { company: { id: 'other-company' } },
      });
      await expectRpc(
        service.createApplicationNote(
          'company-1',
          'application-1',
          { body: 'Great candidate' },
          'company-user',
        ),
        404,
        'Application not found or access denied',
      );
      expect(notes.save).not.toHaveBeenCalled();
    });

    it('creates a note and returns it with the author label', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'company-1' } },
      });
      notes.save.mockResolvedValueOnce({ id: 'note-1' });
      notes.findOne.mockResolvedValueOnce({
        id: 'note-1',
        body: 'Great candidate',
        createdAt: new Date('2026-09-01'),
        author: { id: 'company-user', email: 'rita@acme.test' },
      });

      const result = await service.createApplicationNote(
        'company-1',
        'application-1',
        { body: '  Great candidate  ' },
        'company-user',
      );

      // Body is trimmed on the way in.
      expect(notes.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'Great candidate' }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'note-1',
          applicationId: 'application-1',
          authorName: 'rita@acme.test',
        }),
      );
    });

    it('lists notes newest first and refuses foreign applications', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'company-1' } },
      });
      notes.find.mockResolvedValueOnce([
        {
          id: 'note-1',
          body: 'later',
          createdAt: new Date('2026-09-02'),
          author: { id: 'u1', email: 'a@x' },
        },
      ]);

      const listed = await service.listApplicationNotes(
        'company-1',
        'application-1',
      );
      expect(notes.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'DESC' } }),
      );
      expect(listed).toHaveLength(1);

      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'other-company' } },
      });
      await expectRpc(
        service.listApplicationNotes('company-1', 'application-1'),
        404,
        'Application not found or access denied',
      );
    });

    it('removes a note that belongs to the application', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'company-1' } },
      });
      const stored = { id: 'note-1' };
      notes.findOne.mockResolvedValueOnce(stored);

      const result = await service.deleteApplicationNote(
        'company-1',
        'application-1',
        'note-1',
      );
      expect(result).toEqual({ message: 'Note deleted' });
      expect(notes.remove).toHaveBeenCalledWith(stored);
    });

    it('404s a missing note rather than silently succeeding', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'company-1' } },
      });
      notes.findOne.mockResolvedValueOnce(null);
      await expectRpc(
        service.deleteApplicationNote('company-1', 'application-1', 'note-1'),
        404,
        'Note not found',
      );
      expect(notes.remove).not.toHaveBeenCalled();
    });
  });

  describe('getJobPipeline', () => {
    it('buckets applications into the four live-pipeline columns', async () => {
      // First findOne: the job itself (ownership check).
      jobs.findOne.mockResolvedValueOnce({ id: 'job-1', title: 'Engineer' });
      // getJobApplications runs a second findOne with company relation.
      jobs.findOne.mockResolvedValueOnce({ id: 'job-1', title: 'Engineer' });
      applications.find.mockResolvedValueOnce([
        {
          id: 'a1',
          status: EApplicationStatus.PENDING,
          appliedAt: new Date(),
          reviewedAt: new Date('2026-01-01'),
          employee: { id: 'e1' },
        },
        {
          id: 'a2',
          status: EApplicationStatus.SHORTLISTED,
          appliedAt: new Date(),
          reviewedAt: new Date('2026-01-01'),
          employee: { id: 'e2' },
        },
        {
          // Terminal — deliberately excluded from the board.
          id: 'a3',
          status: EApplicationStatus.HIRED,
          appliedAt: new Date(),
          reviewedAt: new Date('2026-01-01'),
          employee: { id: 'e3' },
        },
      ]);

      const pipeline = await service.getJobPipeline('job-1', 'company-1');
      const cols = new Map(pipeline.columns.map((c) => [c.status, c]));
      expect(cols.get(EApplicationStatus.PENDING)?.count).toBe(1);
      expect(cols.get(EApplicationStatus.SHORTLISTED)?.count).toBe(1);
      expect(cols.get(EApplicationStatus.INTERVIEWING)?.count).toBe(0);
      expect(cols.get(EApplicationStatus.OFFERED)?.count).toBe(0);
      // The HIRED row is not in the board — it is counted in totalCount only
      // because it belongs to the underlying applicant list.
      expect(pipeline.totalCount).toBe(3);
      expect(cols.get(EApplicationStatus.HIRED)).toBeUndefined();
    });

    it('404s when the caller does not own the job', async () => {
      jobs.findOne.mockResolvedValueOnce(null);
      await expectRpc(
        service.getJobPipeline('job-1', 'other-company'),
        404,
        'Job not found or access denied',
      );
    });
  });

  describe('listApplicationStatusHistory', () => {
    it('returns the trail oldest first for an owned application', async () => {
      applications.findOne.mockResolvedValueOnce({
        id: 'application-1',
        job: { company: { id: 'company-1' } },
      });
      history.find.mockResolvedValueOnce([
        {
          id: 'h1',
          from: null,
          to: EApplicationStatus.PENDING,
          note: null,
          createdAt: new Date('2026-09-01'),
          actor: { id: 'u1', email: 'candidate@x' },
        },
        {
          id: 'h2',
          from: EApplicationStatus.PENDING,
          to: EApplicationStatus.SHORTLISTED,
          note: null,
          createdAt: new Date('2026-09-02'),
          actor: { id: 'u2', email: 'rita@acme.test' },
        },
      ]);

      const rows = await service.listApplicationStatusHistory(
        'company-1',
        'application-1',
      );
      expect(history.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
      expect(rows).toHaveLength(2);
      expect(rows[0].from).toBeNull();
      expect(rows[1].actorName).toBe('rita@acme.test');
    });
  });
});
