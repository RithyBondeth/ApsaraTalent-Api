import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchJobDTO } from './job/jobs/search-job.dto';
import { ListNotificationsQueryDTO } from './notification/notification-rpc.dto';
import { PaginationDTO } from './shared/pagination.dto';
import { SearchEmployeeDTO } from './user/employee/search-employee.dto';
import { CompanyRegisterDTO } from './auth/company-register.dto';
import { EmployeeRegisterDTO } from './auth/employee-register.dto';

describe('request DTO transformation and validation', () => {
  it('normalizes single job filters into arrays and numeric pages', async () => {
    const dto = plainToInstance(SearchJobDTO, {
      keyword: 'engineer',
      careerScopes: 'software',
      jobType: 'full-time',
      educationRequired: 'bachelor',
      excludeCompanyIds: 'company-1',
      page: '2',
      pageSize: '25',
    });
    expect(dto).toEqual(
      expect.objectContaining({
        careerScopes: ['software'],
        jobType: ['full-time'],
        educationRequired: ['bachelor'],
        excludeCompanyIds: ['company-1'],
        page: 2,
        pageSize: 25,
      }),
    );
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('preserves existing job-filter arrays', async () => {
    const dto = plainToInstance(SearchJobDTO, {
      careerScopes: ['software', 'data'],
      jobType: ['full-time'],
      educationRequired: ['master'],
      excludeCompanyIds: ['company-1'],
    });
    expect(dto.careerScopes).toEqual(['software', 'data']);
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('normalizes employee filters and rejects invalid ordering', async () => {
    const valid = plainToInstance(SearchEmployeeDTO, {
      careerScopes: 'software',
      education: 'bachelor',
      excludeEmployeeIds: 'employee-1',
      page: '1',
      pageSize: '10',
      sortOrder: 'ASC',
    });
    expect(valid).toEqual(
      expect.objectContaining({
        careerScopes: ['software'],
        education: ['bachelor'],
        excludeEmployeeIds: ['employee-1'],
        page: 1,
        pageSize: 10,
      }),
    );
    await expect(validate(valid)).resolves.toEqual([]);

    const invalid = plainToInstance(SearchEmployeeDTO, {
      keyword: 'x',
      sortOrder: 'SIDEWAYS',
    });
    expect(await validate(invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'keyword' }),
        expect.objectContaining({ property: 'sortOrder' }),
      ]),
    );
  });

  it('validates pagination and notification query boundaries', async () => {
    const pagination = plainToInstance(PaginationDTO, {
      skip: '-1',
      limit: '0',
      requesterId: 'not-a-uuid',
    });
    expect((await validate(pagination)).map((error) => error.property)).toEqual(
      expect.arrayContaining(['skip', 'limit', 'requesterId']),
    );

    const notifications = plainToInstance(ListNotificationsQueryDTO, {
      page: '2',
      limit: '20',
      unreadOnly: true,
    });
    expect(notifications).toEqual(
      expect.objectContaining({ page: 2, limit: 20, unreadOnly: true }),
    );
    await expect(validate(notifications)).resolves.toEqual([]);
  });

  it('rejects malformed job-search security and range inputs', async () => {
    const dto = plainToInstance(SearchJobDTO, {
      keyword: 'x',
      companySizeMin: 'large',
      companySizeMax: 'larger',
      postedDateFrom: 'not-a-date',
      postedDateTo: 'also-not-a-date',
      salaryMin: 'low',
      salaryMax: 'high',
      jobType: [12],
      educationRequired: [false],
      workMode: 'teleport',
      page: 'NaN',
      pageSize: 'NaN',
      requesterId: 'not-a-uuid',
    });

    const properties = (await validate(dto)).map((error) => error.property);
    expect(properties).toEqual(
      expect.arrayContaining([
        'keyword',
        'companySizeMin',
        'companySizeMax',
        'postedDateFrom',
        'postedDateTo',
        'salaryMin',
        'salaryMax',
        'jobType',
        'educationRequired',
        'workMode',
        'page',
        'pageSize',
        'requesterId',
      ]),
    );
  });

  it('transforms and validates every nested company registration collection', async () => {
    const dto = plainToInstance(CompanyRegisterDTO, {
      authEmail: true,
      email: 'company@example.com',
      password: 'Strong!Password123',
      description: 'Technology company',
      industry: 'Technology',
      companySize: '25',
      foundedYear: '2020',
      jobs: [
        {
          title: '',
          description: '',
          type: '',
          experienceRequired: '',
          educationRequired: '',
          skillsRequired: '',
          salaryMin: -1,
          salaryMax: -1,
          openingsCount: 0,
          workMode: 'invalid',
          expireDate: 'invalid',
        },
      ],
      benefits: [{ label: '' }],
      values: [{ label: '' }],
      careerScopes: [{ name: '', description: 12 }],
      socials: [{ platform: 12, url: false }],
      websiteUrl: 'not-a-url',
      companyType: 'invalid',
    });

    expect(dto.companySize).toBe(25);
    expect(dto.foundedYear).toBe(2020);
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'jobs',
        'benefits',
        'values',
        'careerScopes',
        'socials',
        'websiteUrl',
        'companyType',
      ]),
    );
  });

  it('transforms and validates nested employee registration data', async () => {
    const dto = plainToInstance(EmployeeRegisterDTO, {
      authEmail: true,
      email: 'employee@example.com',
      password: 'Strong!Password123',
      dob: '2000-01-01T00:00:00.000Z',
      educations: [{ school: 12, degree: false, year: {} }],
      skills: [{ name: '', description: 12 }],
      experiences: [
        {
          title: '',
          company: 'x'.repeat(101),
          description: '',
          startDate: 'invalid',
          endDate: 'invalid',
        },
      ],
      careerScopes: [{ name: '', description: 12 }],
      socials: [{ platform: 12, url: 'not-a-url' }],
      workMode: 'invalid',
      noticePeriod: 'invalid',
      portfolioUrl: 'not-a-url',
      linkedinUrl: 'not-a-url',
      languages: ['English', 12],
      expectedSalaryMin: -1,
      expectedSalaryMax: -1,
    });

    expect(dto.dob).toBeInstanceOf(Date);
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'educations',
        'skills',
        'experiences',
        'careerScopes',
        'socials',
        'workMode',
        'noticePeriod',
        'portfolioUrl',
        'linkedinUrl',
        'languages',
        'expectedSalaryMin',
        'expectedSalaryMax',
      ]),
    );
  });
});
