import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { RpcException } from '@nestjs/microservices';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  const applications = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const jobs = { findOne: jest.fn() };
  const employees = { findOne: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn() };
  const service = new ApplicationService(
    applications as any,
    jobs as any,
    employees as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    applications.save.mockImplementation(async (value) => value);
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
    applications.findOne.mockResolvedValue({ id: 'existing' });
    await expectRpc(
      service.applyApplication('user-1', { jobId: 'job-1' }),
      409,
      'You have already applied to this job',
    );
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
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'application-1',
        jobId: 'job-1',
        employeeId: 'employee-1',
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
    expect(result).toEqual(
      expect.objectContaining({ status: EApplicationStatus.SHORTLISTED }),
    );
  });

  it('allows only the owning employee to withdraw a pending application', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
    });

    await expect(
      service.withdrawApplication('user-1', 'application-1'),
    ).resolves.toEqual({ message: 'Application withdrawn successfully' });
    expect(applications.findOne).toHaveBeenCalledWith({
      where: {
        id: 'application-1',
        employee: { id: 'employee-1' },
      },
    });
    expect(applications.delete).toHaveBeenCalledWith('application-1');
  });

  it('prevents withdrawal after the application has progressed', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.SHORTLISTED,
    });
    await expectRpc(
      service.withdrawApplication('user-1', 'application-1'),
      400,
      'Only pending applications can be withdrawn',
    );
    expect(applications.delete).not.toHaveBeenCalled();
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

  it('wraps withdrawal delete failures', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1' });
    applications.findOne.mockResolvedValue({
      id: 'application-1',
      status: EApplicationStatus.PENDING,
    });
    applications.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expectRpc(
      service.withdrawApplication('user-1', 'application-1'),
      500,
      'delete failed',
    );
  });
});
