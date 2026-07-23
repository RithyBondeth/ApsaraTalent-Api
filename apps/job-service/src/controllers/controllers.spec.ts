import 'reflect-metadata';
import { ApplicationController } from './application.controller';
import { InterviewController } from './interview.controller';
import { MatchingController } from './matching.controller';

function mockService(methods: string[]) {
  return Object.fromEntries(
    methods.map((method) => [
      method,
      jest.fn().mockResolvedValue({ success: true }),
    ]),
  ) as Record<string, jest.Mock>;
}

describe('Job-service RPC controllers', () => {
  it('delegates every application operation', async () => {
    const service = mockService([
      'applyApplication',
      'getMyApplications',
      'getJobApplications',
      'updateApplicationStatus',
      'withdrawApplication',
    ]);
    const controller = new ApplicationController(service as any);
    await controller.applyApplication('employee-1', { jobId: 'job-1' } as any);
    expect(service.applyApplication).toHaveBeenCalledWith('employee-1', {
      jobId: 'job-1',
    });
    await controller.getMyApplications('employee-1');
    await controller.getJobApplications('job-1', 'company-1');
    await controller.updateApplicationStatus('company-1', {
      status: 'accepted',
    } as any);
    await controller.withdrawApplication('employee-1', 'application-1');
    expect(service.withdrawApplication).toHaveBeenCalledWith(
      'employee-1',
      'application-1',
    );
  });

  it('delegates every interview operation', async () => {
    const service = mockService([
      'createInterview',
      'getInterviewsByEmployee',
      'getInterviewsByCompany',
      'updateInterviewStatus',
    ]);
    const controller = new InterviewController(service as any);
    for (const method of [
      'createInterview',
      'getInterviewsByEmployee',
      'getInterviewsByCompany',
      'updateInterviewStatus',
    ]) {
      const dto = { id: 'value' } as any;
      await (controller as any)[method](dto);
      expect(service[method]).toHaveBeenCalledWith(dto);
    }
  });

  it('delegates every matching operation', async () => {
    const methods = [
      'employeeLikes',
      'companyLikes',
      'unmatch',
      'findCurrentEmployeeLiked',
      'findCurrentCompanyLiked',
      'findCurrentEmployeeMatching',
      'findCurrentCompanyMatching',
      'findCurrentEmployeeMatchingCount',
      'findCurrentCompanyMatchingCount',
      'getMatchingAnalytics',
      'getAiMatchExplanation',
      'getAiMatchProfiles',
      'getAiInterviewPrep',
    ];
    const service = mockService(methods);
    const controller = new MatchingController(service as any);
    for (const method of methods) {
      const dto = { id: 'value' } as any;
      await (controller as any)[method](dto);
      expect(service[method]).toHaveBeenCalledWith(dto);
    }
  });
});
