import { BadRequestException } from '@nestjs/common';
import { JOB_SERVICE } from '@app/contracts';
import { rpcCall } from '../../utils/rpc-call';
import { JobMatchingController } from './matching.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('JobMatchingController', () => {
  const client = {};
  const broadcast = { emitToUser: jest.fn() };
  const aiStream = { pipe: jest.fn() };
  const aiMatching = {
    getMatchExplanationMessages: jest.fn(() => ['match-message']),
    getInterviewPrepMessages: jest.fn(() => ['prep-message']),
    getSkillGapMessages: jest.fn(() => ['gap-message']),
  };
  const access = {
    assertEmployeeAccess: jest.fn(),
    assertCompanyAccess: jest.fn(),
    assertMatchParticipantAccess: jest.fn(),
  };
  const controller = new JobMatchingController(
    client as any,
    broadcast as any,
    aiStream as any,
    aiMatching as any,
    access as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue({
      notificationTargets: ['user-1', 'user-2'],
    });
  });

  it('checks ownership and broadcasts employee/company likes', async () => {
    const dto = { eid: 'employee-1', cid: 'company-1' };
    await controller.employeeLikes(dto, { user: { id: 'employee-user' } });
    expect(access.assertEmployeeAccess).toHaveBeenCalledWith(
      'employee-user',
      'employee-1',
    );
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES,
      dto,
    );
    expect(broadcast.emitToUser).toHaveBeenCalledTimes(2);

    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue({
      notificationTargets: ['employee-user'],
    });
    await controller.companyLikes(dto, { user: { id: 'company-user' } });
    expect(access.assertCompanyAccess).toHaveBeenCalledWith(
      'company-user',
      'company-1',
    );
    expect(broadcast.emitToUser).toHaveBeenCalledWith(
      'employee-user',
      'badgeIncrement',
    );
  });

  it('authorizes unmatching and broadcasts to both auth user rooms', async () => {
    const dto = { eid: 'employee-1', cid: 'company-1' };
    (rpcCall as jest.Mock).mockResolvedValue({
      notifyUserIds: ['employee-user', 'company-user'],
    });
    await controller.unmatch(dto, { user: { id: 'user-1' } });
    expect(access.assertMatchParticipantAccess).toHaveBeenCalledWith(
      'user-1',
      'employee-1',
      'company-1',
    );
    // Socket rooms are keyed by auth user ID, never by the eid/cid profile IDs.
    expect(broadcast.emitToUser).toHaveBeenCalledWith(
      'employee-user',
      'unmatchUpdate',
    );
    expect(broadcast.emitToUser).toHaveBeenCalledWith(
      'company-user',
      'unmatchUpdate',
    );
    expect(broadcast.emitToUser).not.toHaveBeenCalledWith(
      'employee-1',
      'unmatchUpdate',
    );
    expect(broadcast.emitToUser).not.toHaveBeenCalledWith(
      'company-1',
      'unmatchUpdate',
    );
  });

  it('does not broadcast an unmatch when the service returns no user IDs', async () => {
    (rpcCall as jest.Mock).mockResolvedValue({ message: 'Unmatched' });
    await controller.unmatch(
      { eid: 'employee-1', cid: 'company-1' },
      { user: { id: 'user-1' } },
    );
    expect(broadcast.emitToUser).not.toHaveBeenCalled();
  });

  it('authorizes and forwards all current-profile lookup endpoints', async () => {
    const req = { user: { id: 'user-1' } };
    const employeeCalls: Array<[() => Promise<any>, any]> = [
      [
        () => controller.findCurrentEmployeeLiked('employee-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED,
      ],
      [
        () => controller.findCurrentEmployeeMatching('employee-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING,
      ],
      [
        () => controller.findCurrentEmployeeMatchingCount('employee-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT,
      ],
    ];
    for (const [invoke, action] of employeeCalls) {
      await invoke();
      expect(access.assertEmployeeAccess).toHaveBeenLastCalledWith(
        'user-1',
        'employee-1',
      );
      expect(rpcCall).toHaveBeenLastCalledWith(client, action, {
        eid: 'employee-1',
      });
    }
    const companyCalls: Array<[() => Promise<any>, any]> = [
      [
        () => controller.findCurrentCompanyLiked('company-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED,
      ],
      [
        () => controller.findCurrentCompanyMatching('company-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING,
      ],
      [
        () => controller.findCurrentCompanyMatchingCount('company-1', req),
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT,
      ],
    ];
    for (const [invoke, action] of companyCalls) {
      await invoke();
      expect(access.assertCompanyAccess).toHaveBeenLastCalledWith(
        'user-1',
        'company-1',
      );
      expect(rpcCall).toHaveBeenLastCalledWith(client, action, {
        cid: 'company-1',
      });
    }
  });

  it('validates analytics roles before forwarding', async () => {
    await controller.getMatchingAnalytics('employee-1', 'employee', {
      user: { id: 'user-1' },
    });
    expect(access.assertEmployeeAccess).toHaveBeenCalled();
    await controller.getMatchingAnalytics('company-1', 'company', {
      user: { id: 'user-1' },
    });
    expect(access.assertCompanyAccess).toHaveBeenCalled();
    await expect(
      controller.getMatchingAnalytics('id', 'admin', {
        user: { id: 'user-1' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('authorizes non-streaming AI endpoints and applies their timeout', async () => {
    const req = { user: { id: 'user-1' } };
    await controller.getAiMatchExplanation(
      'employee-1',
      'company-1',
      'km',
      req,
    );
    expect(access.assertMatchParticipantAccess).toHaveBeenCalled();
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.AI_MATCH_EXPLANATION,
      { eid: 'employee-1', cid: 'company-1', lang: 'km' },
      expect.any(Number),
    );
    await controller.getAiInterviewPrep(
      'employee-1',
      'company-1',
      'Technical',
      req,
    );
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      JOB_SERVICE.ACTIONS.AI_INTERVIEW_PREP,
      { eid: 'employee-1', cid: 'company-1', interviewTitle: 'Technical' },
      expect.any(Number),
    );
  });

  it('loads profiles and streams all three AI response types', async () => {
    (rpcCall as jest.Mock).mockResolvedValue({
      employeeProfile: { job: 'Developer' },
      companyProfile: { name: 'Apsara' },
    });
    const req = { user: { id: 'user-1' } };
    const res = {} as any;
    await controller.streamAiMatchExplanation(
      'employee-1',
      'company-1',
      'en',
      req,
      res,
    );
    expect(aiStream.pipe).toHaveBeenLastCalledWith(['match-message'], 0.3, res);
    await controller.streamAiInterviewPrep(
      'employee-1',
      'company-1',
      'Technical',
      req,
      res,
    );
    expect(aiStream.pipe).toHaveBeenLastCalledWith(['prep-message'], 0.4, res);
    await controller.streamAiSkillGap(
      'employee-1',
      'company-1',
      'km',
      req,
      res,
    );
    expect(aiStream.pipe).toHaveBeenLastCalledWith(['gap-message'], 0.3, res);
  });
});
