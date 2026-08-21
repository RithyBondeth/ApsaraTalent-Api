import { RpcException } from '@nestjs/microservices';
import { OpenPositionService } from './company/services/open-position.service';
import { ExperienceAndEducationService } from './employee/services/experience-education.service';

describe('profile child-record removal services', () => {
  const logger = { info: jest.fn(), error: jest.fn() };

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  describe('OpenPositionService', () => {
    const jobs = { findOne: jest.fn(), delete: jest.fn() };
    const cache = {
      invalidateCompanyCache: jest.fn(),
    };
    const service = new OpenPositionService(
      logger as any,
      jobs as any,
      cache as any,
    );

    beforeEach(() => jest.clearAllMocks());

    it('prevents a company from deleting a job it does not own', async () => {
      jobs.findOne.mockResolvedValue(null);
      await expectRpc(
        service.removeOpenPosition({ companyId: 'company-1', opId: 'job-1' }),
        404,
        "There's no open position with this id.",
      );
      expect(jobs.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned job and invalidates profile and job-search caches', async () => {
      jobs.findOne.mockResolvedValue({ id: 'job-1', title: 'Engineer' });

      const result = await service.removeOpenPosition({
        companyId: 'company-1',
        opId: 'job-1',
      });

      expect(jobs.findOne).toHaveBeenCalledWith({
        where: { id: 'job-1', company: { id: 'company-1' } },
        relations: ['company'],
      });
      expect(jobs.delete).toHaveBeenCalledWith('job-1');
      expect(cache.invalidateCompanyCache).toHaveBeenCalledWith('company-1');
      expect(result.message).toContain('Engineer');
    });

    it('returns a safe internal error when deletion fails', async () => {
      jobs.findOne.mockRejectedValue(new Error('database details'));
      await expectRpc(
        service.removeOpenPosition({ companyId: 'company-1', opId: 'job-1' }),
        500,
        "An error occurred while removing the company's open positions.",
      );
    });
  });

  describe('ExperienceAndEducationService', () => {
    const experiences = { findOne: jest.fn(), delete: jest.fn() };
    const educations = { findOne: jest.fn(), delete: jest.fn() };
    const cache = { invalidateEmployeeCache: jest.fn() };
    const service = new ExperienceAndEducationService(
      logger as any,
      experiences as any,
      educations as any,
      cache as any,
    );

    beforeEach(() => jest.clearAllMocks());

    it('prevents deleting another employee’s experience', async () => {
      experiences.findOne.mockResolvedValue(null);
      await expectRpc(
        service.removeEmployeeExperience({
          employeeId: 'employee-1',
          experienceId: 'experience-1',
        }),
        404,
        "There's no experience with this id",
      );
    });

    it('invalidates cache and deletes an owned experience', async () => {
      experiences.findOne.mockResolvedValue({
        id: 'experience-1',
        title: 'Developer',
      });
      const result = await service.removeEmployeeExperience({
        employeeId: 'employee-1',
        experienceId: 'experience-1',
      });
      expect(cache.invalidateEmployeeCache).toHaveBeenCalledWith('employee-1');
      expect(experiences.delete).toHaveBeenCalledWith('experience-1');
      expect(result.message).toContain('Developer');
    });

    it('prevents deleting another employee’s education', async () => {
      educations.findOne.mockResolvedValue(null);
      await expectRpc(
        service.removeEmployeeEducation({
          employeeId: 'employee-1',
          educationId: 'education-1',
        }),
        404,
        "There's no education with this id",
      );
    });

    it('invalidates cache and deletes an owned education', async () => {
      educations.findOne.mockResolvedValue({
        id: 'education-1',
        school: 'RUPP',
      });
      const result = await service.removeEmployeeEducation({
        employeeId: 'employee-1',
        educationId: 'education-1',
      });
      expect(cache.invalidateEmployeeCache).toHaveBeenCalledWith('employee-1');
      expect(educations.delete).toHaveBeenCalledWith('education-1');
      expect(result.message).toContain('RUPP');
    });

    it('does not delete when cache invalidation fails', async () => {
      experiences.findOne.mockResolvedValue({ title: 'Developer' });
      cache.invalidateEmployeeCache.mockRejectedValue(new Error('cache down'));
      await expectRpc(
        service.removeEmployeeExperience({
          employeeId: 'employee-1',
          experienceId: 'experience-1',
        }),
        500,
        "An error occurred while removing the employee's experience",
      );
      expect(experiences.delete).not.toHaveBeenCalled();
    });
  });
});
