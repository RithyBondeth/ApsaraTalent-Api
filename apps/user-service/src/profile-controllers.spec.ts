import 'reflect-metadata';
import { FindCompanyController } from './company/controllers/find-company.controller';
import { ImageCompanyController } from './company/controllers/image-company.controller';
import { OpenPositionController } from './company/controllers/open-position.controller';
import { UpdateCompanyInfoController } from './company/controllers/update-company-info.controller';
import { ExperienceAndEducationController } from './employee/controllers/experience-education.controller';
import { FindEmployeeController } from './employee/controllers/find-employee.controller';
import { ImageEmployeeController } from './employee/controllers/image-employee.controller';
import { SearchEmployeeController } from './employee/controllers/search-employee.controller';
import { UpdateEmployeeInfoController } from './employee/controllers/update-employee-info.controller';
import { UploadEmployeeReferenceController } from './employee/controllers/upload-employee-reference.controller';
import { ModerationController } from './moderation/controllers/moderation.controller';
import { SupportController } from './support/controllers/support.controller';

describe('User-service profile RPC controllers', () => {
  const testMappings = async (
    controller: any,
    service: Record<string, jest.Mock>,
    mappings: Array<[string, string]>,
  ) => {
    for (const [controllerMethod, serviceMethod] of mappings) {
      const dto = { value: controllerMethod };
      await controller[controllerMethod](dto);
      expect(service[serviceMethod]).toHaveBeenCalledWith(dto);
    }
  };

  it('delegates company lookup, image, position, and update operations', async () => {
    const findService = {
      findAll: jest.fn().mockResolvedValue([]),
      countAllCompanies: jest.fn().mockResolvedValue({}),
      findOneById: jest.fn().mockResolvedValue({}),
    };
    const find = new FindCompanyController(findService as any);
    await find.findAll({ page: 1 } as any);
    await find.findOneById({ companyId: 'company-1' } as any);
    await find.countAllCompanies();
    expect(findService.countAllCompanies).toHaveBeenCalledWith();

    const imageMethods = [
      'uploadCompanyAvatar',
      'removeCompanyAvatar',
      'uploadCompanyCover',
      'removeCompanyCover',
      'uploadCompanyImages',
      'removeCompanyImage',
    ];
    const imageService = Object.fromEntries(
      imageMethods.map((method) => [method, jest.fn().mockResolvedValue({})]),
    ) as Record<string, jest.Mock>;
    await testMappings(
      new ImageCompanyController(imageService as any),
      imageService,
      imageMethods.map((method) => [method, method]),
    );

    const open = { removeOpenPosition: jest.fn().mockResolvedValue({}) };
    await new OpenPositionController(open as any).removeOpenPosition({} as any);
    expect(open.removeOpenPosition).toHaveBeenCalled();
    const update = { updateCompanyInfo: jest.fn().mockResolvedValue({}) };
    await new UpdateCompanyInfoController(update as any).updateCompanyInfo(
      {} as any,
    );
    expect(update.updateCompanyInfo).toHaveBeenCalled();
  });

  it('delegates employee lookup, image, search, update, and document operations', async () => {
    const findService = {
      findAll: jest.fn().mockResolvedValue([]),
      findOneById: jest.fn().mockResolvedValue({}),
      countAllEmployees: jest.fn().mockResolvedValue({}),
    };
    const find = new FindEmployeeController(findService as any);
    await find.findAll({ page: 1 } as any);
    await find.findOneById({ employeeId: 'employee-1' } as any);
    await find.countAllEmployees();
    expect(findService.countAllEmployees).toHaveBeenCalledWith();

    const imageService = {
      uploadEmployeeAvatar: jest.fn().mockResolvedValue({}),
      removeEmployeeAvatar: jest.fn().mockResolvedValue({}),
    };
    await testMappings(
      new ImageEmployeeController(imageService as any),
      imageService,
      [
        ['uploadEmployeeAvatar', 'uploadEmployeeAvatar'],
        ['removeEmployeeAvatar', 'removeEmployeeAvatar'],
      ],
    );

    const documents = [
      'uploadEmployeeResume',
      'removeEmployeeResume',
      'uploadEmployeeCoverLetter',
      'removeEmployeeCoverLetter',
    ];
    const documentService = Object.fromEntries(
      documents.map((method) => [method, jest.fn().mockResolvedValue({})]),
    ) as Record<string, jest.Mock>;
    await testMappings(
      new UploadEmployeeReferenceController(documentService as any),
      documentService,
      documents.map((method) => [method, method]),
    );

    const items = {
      removeEmployeeExperience: jest.fn().mockResolvedValue({}),
      removeEmployeeEducation: jest.fn().mockResolvedValue({}),
    };
    await testMappings(
      new ExperienceAndEducationController(items as any),
      items,
      [
        ['removeEmployeeExperience', 'removeEmployeeExperience'],
        ['removeEmployeeEducation', 'removeEmployeeEducation'],
      ],
    );

    const search = { searchEmployee: jest.fn().mockResolvedValue({}) };
    await new SearchEmployeeController(search as any).searchEmployee({} as any);
    expect(search.searchEmployee).toHaveBeenCalled();
    const update = { updateEmployeeInfo: jest.fn().mockResolvedValue({}) };
    await new UpdateEmployeeInfoController(update as any).updateEmployeeInfo(
      {} as any,
    );
    expect(update.updateEmployeeInfo).toHaveBeenCalled();
  });

  it('delegates all moderation and support operations unchanged', async () => {
    const methods = [
      'blockUser',
      'unblockUser',
      'listBlockedUsers',
      'getBlockStatus',
      'getHiddenProfileIds',
      'reportUser',
    ];
    const moderationService = Object.fromEntries(
      methods.map((method) => [method, jest.fn().mockResolvedValue({})]),
    ) as Record<string, jest.Mock>;
    await testMappings(
      new ModerationController(moderationService as any),
      moderationService,
      methods.map((method) => [method, method]),
    );
    const support = { reportProblem: jest.fn().mockResolvedValue({}) };
    const dto = { details: 'problem' } as any;
    await new SupportController(support as any).reportProblem(dto);
    expect(support.reportProblem).toHaveBeenCalledWith(dto);
  });
});
