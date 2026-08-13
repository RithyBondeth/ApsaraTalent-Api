import 'reflect-metadata';
import { ApplicationController } from './applications/controllers/application.controller';
import { InterviewController } from './interviews/controllers/interview.controller';
import { MatchingController } from './matching/controllers/matching.controller';

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

  it('delegates every matching operation to the owning service', async () => {
    // MatchingService was split three ways; the owner column is what keeps a
    // delegation from silently landing on the wrong collaborator.
    const owners = {
      matching: [
        'employeeLikes',
        'companyLikes',
        'unmatch',
        'findCurrentEmployeeLiked',
        'findCurrentCompanyLiked',
        'findCurrentEmployeeMatching',
        'findCurrentCompanyMatching',
        'findCurrentEmployeeMatchingCount',
        'findCurrentCompanyMatchingCount',
      ],
      analytics: ['getMatchingAnalytics'],
      ai: ['getAiMatchExplanation', 'getAiMatchProfiles', 'getAiInterviewPrep'],
    };
    const services = {
      matching: mockService(owners.matching),
      analytics: mockService(owners.analytics),
      ai: mockService(owners.ai),
    };
    const controller = new MatchingController(
      services.matching as any,
      services.analytics as any,
      services.ai as any,
    );

    for (const [owner, methods] of Object.entries(owners)) {
      for (const method of methods) {
        const dto = { id: 'value' } as any;
        await (controller as any)[method](dto);
        expect(
          services[owner as keyof typeof services][method],
        ).toHaveBeenCalledWith(dto);

        for (const other of Object.keys(services) as Array<
          keyof typeof services
        >) {
          if (other === owner) continue;
          expect(services[other][method]).toBeUndefined();
        }
      }
    }
  });
});
