import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EEmployeeDocumentType } from '@app/common/database/enums/employee-document-type.enum';
import { USER_SERVICE } from '@app/contracts';
import { serveStorageObject } from '@app/common';
import { rpcCall } from '../../utils/rpc-call';
import { CompanyController } from './company.controller';
import { EmployeeController } from './employee.controller';
import { ModerationController } from './moderation.controller';
import { PublicUserController } from './public-user.controller';
import { SupportController } from './support.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));
jest.mock('@app/common', () => ({
  ...jest.requireActual('@app/common'),
  serveStorageObject: jest.fn(),
}));

describe('API gateway user profile controllers', () => {
  const client = {};
  const storage = { exists: jest.fn() };
  const rpc = rpcCall as jest.Mock;
  const user = { id: 'requester-1' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    rpc.mockResolvedValue({});
  });

  it('maps every company operation to the correct RPC payload', async () => {
    const controller = new CompanyController(client as any);
    const cases: Array<[string, any[], any, any]> = [
      [
        'findAll',
        [user, { page: 2 }],
        USER_SERVICE.ACTIONS.FIND_ALL_COMPANY,
        { page: 2, requesterId: user.id },
      ],
      [
        'findOneById',
        [user, 'company-1'],
        USER_SERVICE.ACTIONS.FIND_ONE_COMPANY_BY_ID,
        { companyId: 'company-1', requesterId: user.id },
      ],
      [
        'updateCompanyInfo',
        ['company-1', { name: 'A' }],
        USER_SERVICE.ACTIONS.UPDATE_COMPANY_INFO,
        { companyId: 'company-1', updateCompanyInfoDTO: { name: 'A' } },
      ],
      [
        'uploadCompanyAvatar',
        ['company-1', { filename: 'a' }],
        USER_SERVICE.ACTIONS.UPLOAD_COMPANY_AVATAR,
        { companyId: 'company-1', avatar: { filename: 'a' } },
      ],
      [
        'removeCompanyAvatar',
        ['company-1'],
        USER_SERVICE.ACTIONS.REMOVE_COMPANY_AVATAR,
        { companyId: 'company-1' },
      ],
      [
        'uploadCompanyCover',
        ['company-1', { filename: 'c' }],
        USER_SERVICE.ACTIONS.UPLOAD_COMPANY_COVER,
        { companyId: 'company-1', cover: { filename: 'c' } },
      ],
      [
        'removeCompanyCover',
        ['company-1'],
        USER_SERVICE.ACTIONS.REMOVE_COMPANY_COVER,
        { companyId: 'company-1' },
      ],
      [
        'uploadCompanyImages',
        ['company-1', [{ filename: 'i' }]],
        USER_SERVICE.ACTIONS.UPLOAD_COMPANY_IMAGES,
        { companyId: 'company-1', images: [{ filename: 'i' }] },
      ],
      [
        'removeCompanyImage',
        ['company-1', 'image-1'],
        USER_SERVICE.ACTIONS.REMOVE_COMPANY_IMAGES,
        { companyId: 'company-1', imageId: 'image-1' },
      ],
      [
        'removeOpenPosition',
        ['company-1', 'position-1'],
        USER_SERVICE.ACTIONS.REMOVE_OPEN_POSITION,
        { companyId: 'company-1', opId: 'position-1' },
      ],
      ['countAllCompanies', [], USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY, {}],
    ];
    for (const [method, args, action, payload] of cases) {
      await (controller as any)[method](...args);
      expect(rpc).toHaveBeenLastCalledWith(client, action, payload);
    }
  });

  it('maps employee operations and normalizes search pagination', async () => {
    const controller = new EmployeeController(client as any, storage as any);
    const cases: Array<[string, any[], any, any]> = [
      [
        'findAll',
        [user, { page: 1 }],
        USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE,
        { page: 1, requesterId: user.id },
      ],
      [
        'findOneById',
        [user, 'employee-1'],
        USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID,
        { employeeId: 'employee-1', requesterId: user.id },
      ],
      [
        'updateEmployeeInfo',
        ['employee-1', { title: 'Dev' }],
        USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO,
        { employeeId: 'employee-1', updateEmployeeInfoDTO: { title: 'Dev' } },
      ],
      [
        'uploadEmployeeAvatar',
        ['employee-1', { filename: 'a' }],
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR,
        { employeeId: 'employee-1', avatar: { filename: 'a' } },
      ],
      [
        'removeEmployeeAvatar',
        ['employee-1'],
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR,
        { employeeId: 'employee-1' },
      ],
      [
        'uploadEmployeeResume',
        ['employee-1', { filename: 'r' }],
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME,
        { employeeId: 'employee-1', resume: { filename: 'r' } },
      ],
      [
        'removeEmployeeResume',
        ['employee-1'],
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME,
        { employeeId: 'employee-1' },
      ],
      [
        'uploadEmployeeCoverLetter',
        ['employee-1', { filename: 'c' }],
        USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER,
        { employeeId: 'employee-1', coverLetter: { filename: 'c' } },
      ],
      [
        'removeEmployeeCoverLetter',
        ['employee-1'],
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER,
        { employeeId: 'employee-1' },
      ],
      [
        'removeEmployeeEducation',
        ['employee-1', 'education-1'],
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EDUCATION,
        { employeeId: 'employee-1', educationId: 'education-1' },
      ],
      [
        'removeEmployeeExperience',
        ['employee-1', 'experience-1'],
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_EXPERIENCE,
        { employeeId: 'employee-1', experienceId: 'experience-1' },
      ],
    ];
    for (const [method, args, action, payload] of cases) {
      await (controller as any)[method](...args);
      expect(rpc).toHaveBeenLastCalledWith(client, action, payload);
    }
    await controller.searchEmployee(user, { page: '2', pageSize: '10' } as any);
    expect(rpc).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES,
      expect.objectContaining({ page: 2, pageSize: 10, requesterId: user.id }),
      20_000,
    );
  });

  it('rejects an avatar upload without a file', async () => {
    const controller = new EmployeeController(client as any, storage as any);
    await expect(
      controller.uploadEmployeeAvatar('employee-1', undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    [EEmployeeDocumentType.RESUME, '/storage/resumes/cv.pdf', 'resumes/cv.pdf'],
    [
      EEmployeeDocumentType.COVER_LETTER,
      '/storage/cover-letters/letter.pdf',
      'cover-letters/letter.pdf',
    ],
  ])(
    'serves an authorized %s from protected storage',
    async (type, path, key) => {
      const controller = new EmployeeController(client as any, storage as any);
      rpc.mockResolvedValue({ resume: path, coverLetter: path });
      storage.exists.mockResolvedValue(true);
      const res = {} as any;
      await controller.getDocument(user, 'employee-1', type, res);
      expect(storage.exists).toHaveBeenCalledWith(key);
      expect(serveStorageObject).toHaveBeenCalledWith(
        res,
        storage,
        key,
        expect.objectContaining({ cacheControl: 'private, no-store' }),
      );
    },
  );

  it('rejects absent, malformed, and missing employee documents', async () => {
    const controller = new EmployeeController(client as any, storage as any);
    rpc.mockResolvedValue({ resume: '/public/cv.pdf' });
    await expect(
      controller.getDocument(
        user,
        'employee-1',
        EEmployeeDocumentType.RESUME,
        {} as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    rpc.mockResolvedValue({ resume: '/storage/resumes/cv.pdf' });
    storage.exists.mockResolvedValue(false);
    await expect(
      controller.getDocument(
        user,
        'employee-1',
        EEmployeeDocumentType.RESUME,
        {} as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps moderation and support operations without trusting client user ids', async () => {
    const moderation = new ModerationController(client as any);
    const cases: Array<[string, any[], any, any]> = [
      [
        'blockUser',
        [user, 'other'],
        USER_SERVICE.ACTIONS.BLOCK_USER,
        { blockerId: user.id, blockedId: 'other' },
      ],
      [
        'unblockUser',
        [user, 'other'],
        USER_SERVICE.ACTIONS.UNBLOCK_USER,
        { blockerId: user.id, blockedId: 'other' },
      ],
      [
        'listBlockedUsers',
        [user],
        USER_SERVICE.ACTIONS.LIST_BLOCKED_USERS,
        { blockerId: user.id },
      ],
      [
        'getBlockStatus',
        [user, 'other'],
        USER_SERVICE.ACTIONS.GET_BLOCK_STATUS,
        { userId: user.id, otherUserId: 'other' },
      ],
      [
        'getHiddenProfileIds',
        [user],
        USER_SERVICE.ACTIONS.GET_HIDDEN_PROFILE_IDS,
        { requesterId: user.id },
      ],
      [
        'reportUser',
        [user, { reportedId: 'other', reason: 'spam', details: 'x' }],
        USER_SERVICE.ACTIONS.REPORT_USER,
        {
          reporterId: user.id,
          reportedId: 'other',
          reason: 'spam',
          details: 'x',
        },
      ],
    ];
    for (const [method, args, action, payload] of cases) {
      await (moderation as any)[method](...args);
      expect(rpc).toHaveBeenLastCalledWith(client, action, payload);
    }
    const support = new SupportController(client as any);
    await support.reportProblem(user, {
      category: 'bug',
      details: 'broken',
      pageUrl: '/jobs',
      userAgent: 'browser',
    } as any);
    expect(rpc).toHaveBeenLastCalledWith(
      client,
      USER_SERVICE.ACTIONS.REPORT_PROBLEM,
      {
        reporterId: user.id,
        category: 'bug',
        details: 'broken',
        pageUrl: '/jobs',
        userAgent: 'browser',
      },
    );
  });

  it('combines public landing counts and defaults missing service values to zero', async () => {
    rpc
      .mockResolvedValueOnce({ totalUsers: 5 })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ totalEmployees: 3 });
    const result = await new PublicUserController(
      client as any,
    ).getLandingStats();
    expect(result).toMatchObject({ users: 5, companies: 0, employees: 3 });
  });
});
