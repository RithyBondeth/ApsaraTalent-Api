import 'reflect-metadata';
import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { InterviewStatus } from '@app/contracts/dtos/job';
import { RpcException } from '@nestjs/microservices';
import { InterviewService } from './interview.service';

describe('InterviewService', () => {
  const interviews = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
  };
  const employees = { findOne: jest.fn() };
  const companies = { findOne: jest.fn() };
  const matches = { findOne: jest.fn() };
  const applications = { findOne: jest.fn(), save: jest.fn() };
  const notifications = { emit: jest.fn() };
  const logger = { error: jest.fn() };
  const service = new InterviewService(
    interviews as any,
    employees as any,
    companies as any,
    matches as any,
    applications as any,
    notifications as any,
    logger as any,
  );

  const createDto = {
    employeeId: 'employee-1',
    companyId: 'company-1',
    title: 'Technical interview',
    description: 'Discuss the role',
    scheduledAt: '2026-08-01T03:00:00.000Z',
    durationMinutes: 45,
    location: 'Office',
    meetingLink: undefined,
    createdBy: 'company' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    interviews.save.mockImplementation(async (value) => ({
      id: 'interview-1',
      ...value,
    }));
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

  it('allows only companies to schedule interviews', async () => {
    await expectRpc(
      service.createInterview({ ...createDto, createdBy: 'employee' }),
      403,
      'Only companies can schedule interviews.',
    );
    expect(matches.findOne).not.toHaveBeenCalled();
  });

  it('requires an active match before scheduling', async () => {
    matches.findOne.mockResolvedValue(null);
    await expectRpc(
      service.createInterview(createDto),
      403,
      'You can only schedule interviews with matches.',
    );
  });

  it('requires both participant profiles', async () => {
    matches.findOne.mockResolvedValue({ id: 'match-1' });
    employees.findOne.mockResolvedValue(null);
    companies.findOne.mockResolvedValue({ id: 'company-1' });
    await expectRpc(
      service.createInterview(createDto),
      404,
      'Employee or Company not found.',
    );
  });

  it('schedules an interview and notifies the employee', async () => {
    const employee = {
      id: 'employee-1',
      username: 'Applicant',
      user: { id: 'employee-user' },
    };
    const company = {
      id: 'company-1',
      name: 'Apsara',
      user: { id: 'company-user' },
    };
    matches.findOne.mockResolvedValue({ id: 'match-1' });
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);

    const result = await service.createInterview(createDto);

    expect(interviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employee,
        company,
        status: 'pending',
        scheduledAt: new Date(createDto.scheduledAt),
      }),
    );
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'employee-user',
        type: 'interview',
        sendPush: true,
      }),
    );
    expect(result.notifyUserId).toBe('employee-user');
  });

  describe('scheduling against an application', () => {
    const employee = {
      id: 'employee-1',
      username: 'Applicant',
      user: { id: 'employee-user' },
    };
    const company = {
      id: 'company-1',
      name: 'Apsara',
      user: { id: 'company-user' },
    };
    const applicationDto = { ...createDto, applicationId: 'application-1' };

    beforeEach(() => {
      employees.findOne.mockResolvedValue(employee);
      companies.findOne.mockResolvedValue(company);
    });

    it('does not require a match when an application backs the interview', async () => {
      applications.findOne.mockResolvedValue({
        id: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
        job: { id: 'job-1', company: { id: 'company-1' } },
        employee: { id: 'employee-1' },
      });
      matches.findOne.mockResolvedValue(null);

      const result = await service.createInterview(applicationDto);

      expect(matches.findOne).not.toHaveBeenCalled();
      expect(result.applicationId).toBe('application-1');
    });

    it('advances a shortlisted application to interviewing', async () => {
      const application = {
        id: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
        job: { id: 'job-1', company: { id: 'company-1' } },
        employee: { id: 'employee-1' },
      };
      applications.findOne.mockResolvedValue(application);

      await service.createInterview(applicationDto);

      expect(application.status).toBe(EApplicationStatus.INTERVIEWING);
      expect(applications.save).toHaveBeenCalledWith(application);
    });

    it('does not move an application backwards to book a follow-up', async () => {
      const application = {
        id: 'application-1',
        status: EApplicationStatus.OFFERED,
        job: { id: 'job-1', company: { id: 'company-1' } },
        employee: { id: 'employee-1' },
      };
      applications.findOne.mockResolvedValue(application);

      await service.createInterview(applicationDto);

      expect(application.status).toBe(EApplicationStatus.OFFERED);
      expect(applications.save).not.toHaveBeenCalled();
    });

    it('rejects an application belonging to another company', async () => {
      applications.findOne.mockResolvedValue({
        id: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
        job: { id: 'job-1', company: { id: 'other-company' } },
        employee: { id: 'employee-1' },
      });

      await expectRpc(
        service.createInterview(applicationDto),
        403,
        'Application not found or access denied.',
      );
    });

    it('rejects an application for a different employee', async () => {
      applications.findOne.mockResolvedValue({
        id: 'application-1',
        status: EApplicationStatus.SHORTLISTED,
        job: { id: 'job-1', company: { id: 'company-1' } },
        employee: { id: 'someone-else' },
      });

      await expectRpc(
        service.createInterview(applicationDto),
        403,
        'Application not found or access denied.',
      );
    });

    it('refuses to schedule against a closed application', async () => {
      applications.findOne.mockResolvedValue({
        id: 'application-1',
        status: EApplicationStatus.REJECTED,
        job: { id: 'job-1', company: { id: 'company-1' } },
        employee: { id: 'employee-1' },
      });

      await expectRpc(
        service.createInterview(applicationDto),
        400,
        'Cannot schedule an interview for a rejected application.',
      );
    });
  });

  it('does not emit when the employee has no linked user', async () => {
    matches.findOne.mockResolvedValue({ id: 'match-1' });
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      username: 'Applicant',
    });
    companies.findOne.mockResolvedValue({
      id: 'company-1',
      name: 'Apsara',
      user: { id: 'company-user' },
    });

    const result = await service.createInterview(createDto);
    expect(notifications.emit).not.toHaveBeenCalled();
    expect(result.notifyUserId).toBeNull();
  });

  it('lists employee interviews chronologically', async () => {
    interviews.find.mockResolvedValue([{ id: 'interview-1' }]);
    const result = await service.getInterviewsByEmployee({
      employeeId: 'employee-1',
    });
    expect(interviews.find).toHaveBeenCalledWith({
      where: { employee: { id: 'employee-1' } },
      relations: ['employee', 'company'],
      order: { scheduledAt: 'ASC' },
    });
    expect(result).toHaveLength(1);
  });

  it('lists company interviews chronologically', async () => {
    interviews.find.mockResolvedValue([{ id: 'interview-1' }]);
    await service.getInterviewsByCompany({ companyId: 'company-1' });
    expect(interviews.find).toHaveBeenCalledWith({
      where: { company: { id: 'company-1' } },
      relations: ['employee', 'company'],
      order: { scheduledAt: 'ASC' },
    });
  });

  it('rejects a status update for a missing interview', async () => {
    interviews.findOne.mockResolvedValue(null);
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'missing',
        requestUserId: 'employee-user',
        status: InterviewStatus.ACCEPTED,
      }),
      404,
      'Interview not found.',
    );
  });

  function existingInterview(
    status: InterviewStatus = InterviewStatus.PENDING,
  ) {
    return {
      id: 'interview-1',
      title: 'Technical interview',
      status,
      employee: {
        id: 'employee-1',
        username: 'Applicant',
        user: { id: 'employee-user' },
      },
      company: {
        id: 'company-1',
        name: 'Apsara',
        user: { id: 'company-user' },
      },
    };
  }

  it('blocks a user who is not an interview participant', async () => {
    interviews.findOne.mockResolvedValue(existingInterview());
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'outsider',
        status: InterviewStatus.ACCEPTED,
      }),
      403,
      'You are not involved in this interview.',
    );
  });

  it('allows employees only to accept or decline', async () => {
    interviews.findOne.mockResolvedValue(existingInterview());
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'employee-user',
        status: InterviewStatus.CANCELLED,
      }),
      403,
      'Employees can only accept or decline interviews.',
    );
  });

  it('allows companies only to cancel or complete', async () => {
    interviews.findOne.mockResolvedValue(existingInterview());
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'company-user',
        status: InterviewStatus.ACCEPTED,
      }),
      403,
      'Companies can only cancel or complete interviews.',
    );
  });

  it('rejects invalid status transitions', async () => {
    interviews.findOne.mockResolvedValue(
      existingInterview(InterviewStatus.DECLINED),
    );
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'company-user',
        status: InterviewStatus.COMPLETED,
      }),
      400,
      'Cannot transition from "declined" to "completed".',
    );
  });

  it('saves an employee acceptance and notifies the company', async () => {
    const interview = existingInterview();
    interviews.findOne.mockResolvedValue(interview);

    const result = await service.updateInterviewStatus({
      interviewId: 'interview-1',
      requestUserId: 'employee-user',
      status: InterviewStatus.ACCEPTED,
    });

    expect(interview.status).toBe(InterviewStatus.ACCEPTED);
    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'company-user',
        data: expect.objectContaining({ status: InterviewStatus.ACCEPTED }),
      }),
    );
    expect(result.notifyUserId).toBe('company-user');
  });

  it('saves a company cancellation and notifies the employee', async () => {
    const interview = existingInterview();
    interviews.findOne.mockResolvedValue(interview);

    const result = await service.updateInterviewStatus({
      interviewId: 'interview-1',
      requestUserId: 'company-user',
      status: InterviewStatus.CANCELLED,
    });

    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'employee-user' }),
    );
    expect(result.notifyUserId).toBe('employee-user');
  });

  it('wraps list failures as internal RPC errors', async () => {
    interviews.find.mockRejectedValue(new Error('database unavailable'));
    await expectRpc(
      service.getInterviewsByEmployee({ employeeId: 'employee-1' }),
      500,
      'database unavailable',
    );
  });

  it('uses the default duration when zero is supplied', async () => {
    matches.findOne.mockResolvedValue({ id: 'match-1' });
    employees.findOne.mockResolvedValue({
      id: 'employee-1',
      firstname: 'Sok',
      user: { id: 'employee-user' },
    });
    companies.findOne.mockResolvedValue({
      id: 'company-1',
      name: 'Apsara',
      user: { id: 'company-user' },
    });
    await service.createInterview({ ...createDto, durationMinutes: 0 });
    expect(interviews.create).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: expect.any(Number) }),
    );
  });

  it('wraps create failures with supplied and fallback messages', async () => {
    matches.findOne.mockRejectedValueOnce({
      message: 'query failed',
      statusCode: 503,
    });
    await expectRpc(service.createInterview(createDto), 503, 'query failed');

    matches.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.createInterview(createDto),
      500,
      'An error occurred while creating the interview.',
    );
  });

  it('wraps company-list failures with supplied and fallback messages', async () => {
    interviews.find.mockRejectedValueOnce(new Error('company query failed'));
    await expectRpc(
      service.getInterviewsByCompany({ companyId: 'company-1' }),
      500,
      'company query failed',
    );
    interviews.find.mockRejectedValueOnce(null);
    await expectRpc(
      service.getInterviewsByCompany({ companyId: 'company-1' }),
      500,
      'An error occurred while fetching interviews.',
    );
  });

  it('returns null and skips notification when the other user is absent', async () => {
    const interview = existingInterview();
    interview.company.user = undefined as any;
    interviews.findOne.mockResolvedValue(interview);
    const result = await service.updateInterviewStatus({
      interviewId: 'interview-1',
      requestUserId: 'employee-user',
      status: InterviewStatus.ACCEPTED,
    });
    expect(result.notifyUserId).toBeNull();
    expect(notifications.emit).not.toHaveBeenCalled();
  });

  it('wraps status persistence failures with supplied and fallback messages', async () => {
    interviews.findOne.mockResolvedValue(existingInterview());
    interviews.save.mockRejectedValueOnce({
      message: 'write failed',
      statusCode: 503,
    });
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'employee-user',
        status: InterviewStatus.ACCEPTED,
      }),
      503,
      'write failed',
    );

    interviews.findOne.mockResolvedValue(existingInterview());
    interviews.save.mockRejectedValueOnce(null);
    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'employee-user',
        status: InterviewStatus.ACCEPTED,
      }),
      500,
      'An error occurred while updating interview status.',
    );
  });

  it('rejects transitions from an unknown stored interview status', async () => {
    interviews.findOne.mockResolvedValue(
      existingInterview('legacy-status' as InterviewStatus),
    );

    await expectRpc(
      service.updateInterviewStatus({
        interviewId: 'interview-1',
        requestUserId: 'employee-user',
        status: InterviewStatus.ACCEPTED,
      }),
      400,
      'Cannot transition from "legacy-status" to "accepted".',
    );
  });

  it('uses the employee first name when notifying after a status update', async () => {
    const interview = existingInterview();
    interview.employee.username = '';
    (interview.employee as any).firstname = 'Fallback Name';
    interviews.findOne.mockResolvedValue(interview);

    await service.updateInterviewStatus({
      interviewId: 'interview-1',
      requestUserId: 'employee-user',
      status: InterviewStatus.ACCEPTED,
    });

    expect(notifications.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ senderName: 'Fallback Name' }),
      }),
    );
  });

  it('uses the employee-list fallback for a null repository failure', async () => {
    interviews.find.mockRejectedValueOnce(null);
    await expectRpc(
      service.getInterviewsByEmployee({ employeeId: 'employee-1' }),
      500,
      'An error occurred while fetching interviews.',
    );
  });
});
