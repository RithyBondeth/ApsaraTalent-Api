import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CompanyController } from './company.controller';
import { EmployeeController } from './employee.controller';
import { CompanyProfileOwnerGuard } from '../guards/company-profile-owner.guard';
import { EmployeeProfileOwnerGuard } from '../guards/employee-profile-owner.guard';

function expectGuardOnMethods(
  controller: object,
  methodNames: string[],
  guard: object,
): void {
  for (const methodName of methodNames) {
    const handler = (controller as Record<string, unknown>)[methodName];
    const guards =
      Reflect.getMetadata(GUARDS_METADATA, handler as object) ?? [];
    expect(guards).toContain(guard);
  }
}

describe('profile mutation ownership', () => {
  it('protects every employee profile mutation', () => {
    expectGuardOnMethods(
      EmployeeController.prototype,
      [
        'updateEmployeeInfo',
        'uploadEmployeeAvatar',
        'removeEmployeeAvatar',
        'uploadEmployeeResume',
        'removeEmployeeResume',
        'uploadEmployeeCoverLetter',
        'removeEmployeeCoverLetter',
        'removeEmployeeEducation',
        'removeEmployeeExperience',
      ],
      EmployeeProfileOwnerGuard,
    );
  });

  it('protects every company profile mutation', () => {
    expectGuardOnMethods(
      CompanyController.prototype,
      [
        'updateCompanyInfo',
        'uploadCompanyAvatar',
        'removeCompanyAvatar',
        'uploadCompanyCover',
        'removeCompanyCover',
        'uploadCompanyImages',
        'removeCompanyImage',
        'removeOpenPosition',
      ],
      CompanyProfileOwnerGuard,
    );
  });
});
