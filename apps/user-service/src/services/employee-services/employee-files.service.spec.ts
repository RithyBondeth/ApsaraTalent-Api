import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { RpcException } from '@nestjs/microservices';
import { ImageEmployeeService } from './image-employee.service';
import { UploadEmployeeReferenceService } from './upload-employee-reference.service';

describe('employee file services', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const uploads = { getUploadFile: jest.fn() };
  const cache = { invalidateEmployeeCache: jest.fn() };
  const logger = { error: jest.fn() };
  const imageService = new ImageEmployeeService(
    repository as any,
    uploads as any,
    cache as any,
    logger as any,
  );
  const referenceService = new UploadEmployeeReferenceService(
    repository as any,
    uploads as any,
    cache as any,
    logger as any,
  );
  const file = { filename: 'new-file.pdf' } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (value) => value);
    uploads.getUploadFile.mockReturnValue('/storage/new-file.pdf');
    jest.spyOn(UploadfileService, 'deleteFile').mockImplementation(() => true);
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

  it('deletes an orphan avatar upload when the employee is missing', async () => {
    repository.findOne.mockResolvedValue(null);
    await expectRpc(
      imageService.uploadEmployeeAvatar({
        employeeId: 'missing',
        avatar: file,
      }),
      404,
      'There is no employee with this ID.',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/employee-avatars/new-file.pdf'),
      'Avatar Image',
    );
  });

  it('replaces an avatar, saves it, and invalidates profile caches', async () => {
    const employee = { id: 'employee-1', avatar: '/old/avatar.png' };
    repository.findOne.mockResolvedValue(employee);

    await imageService.uploadEmployeeAvatar({
      employeeId: 'employee-1',
      avatar: file,
    });

    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/employee-avatars/avatar.png'),
      'Old Avatar Image',
    );
    expect(employee.avatar).toBe('/storage/new-file.pdf');
    expect(repository.save).toHaveBeenCalledWith(employee);
    expect(cache.invalidateEmployeeCache).toHaveBeenCalledWith('employee-1');
  });

  it('removes an avatar and preserves a proper missing-profile error', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'employee-1',
      avatar: '/avatars/old.png',
    });
    await imageService.removeEmployeeAvatar({ employeeId: 'employee-1' });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: null }),
    );

    repository.findOne.mockResolvedValueOnce(null);
    await expectRpc(
      imageService.removeEmployeeAvatar({ employeeId: 'missing' }),
      404,
      'There is no employee with this ID.',
    );
  });

  it('deletes an orphan resume upload when the employee is missing', async () => {
    repository.findOne.mockResolvedValue(null);
    await expectRpc(
      referenceService.uploadEmployeeResume({
        employeeId: 'missing',
        resume: file,
      }),
      404,
      'There is no employee with this ID.',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('replaces and removes a resume with cache invalidation', async () => {
    const employee = { id: 'employee-1', resume: '/resumes/old.pdf' };
    repository.findOne.mockResolvedValue(employee);

    await referenceService.uploadEmployeeResume({
      employeeId: 'employee-1',
      resume: file,
    });
    expect(employee.resume).toBe('/storage/new-file.pdf');
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/resumes/old.pdf'),
      'Old Resume File',
    );

    await referenceService.removeEmployeeResume({ employeeId: 'employee-1' });
    expect(employee.resume).toBeNull();
    expect(cache.invalidateEmployeeCache).toHaveBeenCalledTimes(2);
  });

  it('replaces and removes a cover letter with cache invalidation', async () => {
    const employee = {
      id: 'employee-1',
      coverLetter: '/cover-letters/old.pdf',
    };
    repository.findOne.mockResolvedValue(employee);

    await referenceService.uploadEmployeeCoverLetter({
      employeeId: 'employee-1',
      coverLetter: file,
    });
    expect(employee.coverLetter).toBe('/storage/new-file.pdf');
    expect(uploads.getUploadFile).toHaveBeenCalledWith('cover-letters', file);

    await referenceService.removeEmployeeCoverLetter({
      employeeId: 'employee-1',
    });
    expect(employee.coverLetter).toBeNull();
    expect(cache.invalidateEmployeeCache).toHaveBeenCalledTimes(2);
  });

  it('does not hide storage or database failures behind a success response', async () => {
    repository.findOne.mockResolvedValue({ id: 'employee-1' });
    repository.save.mockRejectedValue(new Error('database unavailable'));
    await expectRpc(
      referenceService.uploadEmployeeResume({
        employeeId: 'employee-1',
        resume: file,
      }),
      500,
      "An error occurred while uploading the employee's resume.",
    );
  });

  it('cleans up orphan cover letters for missing employees', async () => {
    repository.findOne.mockResolvedValue(null);
    await expectRpc(
      referenceService.uploadEmployeeCoverLetter({
        employeeId: 'missing',
        coverLetter: file,
      }),
      404,
      'There is no employee with this ID.',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/cover-letters/new-file.pdf'),
      'Cover Letter File',
    );
  });

  it.each([
    ['removeEmployeeResume', { employeeId: 'missing' }],
    ['removeEmployeeCoverLetter', { employeeId: 'missing' }],
  ])('preserves missing-employee errors from %s', async (method, dto) => {
    repository.findOne.mockResolvedValue(null);
    await expectRpc(
      (referenceService as any)[method](dto),
      404,
      'There is no employee with this ID.',
    );
  });

  it.each([
    [
      'removeEmployeeResume',
      { employeeId: 'employee-1' },
      { id: 'employee-1', resume: '/resumes/old.pdf' },
    ],
    [
      'uploadEmployeeCoverLetter',
      { employeeId: 'employee-1', coverLetter: file },
      { id: 'employee-1' },
    ],
    [
      'removeEmployeeCoverLetter',
      { employeeId: 'employee-1' },
      { id: 'employee-1', coverLetter: '/cover-letters/old.pdf' },
    ],
  ])('wraps database/cache failure from %s', async (method, dto, employee) => {
    repository.findOne.mockResolvedValue(employee);
    repository.save.mockRejectedValueOnce(new Error('write failed'));
    await expectRpc(
      (referenceService as any)[method](dto),
      500,
      'write failed',
    );
  });

  it('wraps cache invalidation failure after a document write', async () => {
    repository.findOne.mockResolvedValue({ id: 'employee-1' });
    cache.invalidateEmployeeCache.mockRejectedValueOnce(
      new Error('cache down'),
    );
    await expectRpc(
      referenceService.uploadEmployeeCoverLetter({
        employeeId: 'employee-1',
        coverLetter: file,
      }),
      500,
      'cache down',
    );
  });
});
