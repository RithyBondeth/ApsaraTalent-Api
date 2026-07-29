import 'reflect-metadata';
import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { RpcException } from '@nestjs/microservices';
import { ImageEmployeeService } from './image-employee.service';

describe('ImageEmployeeService', () => {
  const employees = { findOne: jest.fn(), save: jest.fn() };
  const uploads = { getUploadFile: jest.fn() };
  const cache = { invalidateEmployeeCache: jest.fn() };
  const logger = { error: jest.fn() };
  const file = { filename: 'new.png' } as Express.Multer.File;
  const service = new ImageEmployeeService(
    employees as any,
    uploads as any,
    cache as any,
    logger as any,
  );

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    employees.save.mockImplementation(async (value) => value);
    uploads.getUploadFile.mockReturnValue('/employee-avatars/new.png');
    cache.invalidateEmployeeCache.mockResolvedValue(undefined);
    jest.spyOn(UploadfileService, 'deleteFile').mockImplementation();
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

  it('cleans up an orphaned upload when the employee is missing', async () => {
    employees.findOne.mockResolvedValue(null);
    await expectRpc(
      service.uploadEmployeeAvatar({ employeeId: 'missing', avatar: file }),
      404,
      'There is no employee with this ID.',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('new.png'),
      'Avatar Image',
    );
  });

  it('replaces an old avatar and invalidates employee caches', async () => {
    const employee = { id: 'employee-1', avatar: '/old/old.png' };
    employees.findOne.mockResolvedValue(employee);
    await service.uploadEmployeeAvatar({
      employeeId: 'employee-1',
      avatar: file,
    });
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('old.png'),
      'Old Avatar Image',
    );
    expect(employee.avatar).toBe('/employee-avatars/new.png');
    expect(cache.invalidateEmployeeCache).toHaveBeenCalledWith('employee-1');
  });

  it('uploads when no previous avatar exists', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1', avatar: null });
    await service.uploadEmployeeAvatar({
      employeeId: 'employee-1',
      avatar: file,
    });
    expect(UploadfileService.deleteFile).not.toHaveBeenCalled();
  });

  it.each([
    ['storage failure', uploads.getUploadFile, new Error('storage failed')],
    ['database failure', employees.save, new Error('save failed')],
    ['cache failure', cache.invalidateEmployeeCache, new Error('cache failed')],
  ])('wraps upload %s', async (_label, operation, failure) => {
    employees.findOne.mockResolvedValue({ id: 'employee-1', avatar: null });
    operation.mockImplementationOnce(() => {
      throw failure;
    });
    await expect(
      service.uploadEmployeeAvatar({
        employeeId: 'employee-1',
        avatar: file,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('rejects removal for a missing employee', async () => {
    employees.findOne.mockResolvedValue(null);
    await expectRpc(
      service.removeEmployeeAvatar({ employeeId: 'missing' }),
      404,
      'There is no employee with this ID.',
    );
  });

  it('removes an avatar and also supports an already-empty profile', async () => {
    const withAvatar = { id: 'employee-1', avatar: '/avatars/old.png' };
    employees.findOne
      .mockResolvedValueOnce(withAvatar)
      .mockResolvedValueOnce({ id: 'employee-2', avatar: null });
    await service.removeEmployeeAvatar({ employeeId: 'employee-1' });
    await service.removeEmployeeAvatar({ employeeId: 'employee-2' });
    expect(withAvatar.avatar).toBeNull();
    expect(UploadfileService.deleteFile).toHaveBeenCalledTimes(1);
  });

  it('wraps removal persistence and cache failures', async () => {
    employees.findOne.mockResolvedValue({ id: 'employee-1', avatar: null });
    employees.save.mockRejectedValueOnce(new Error('save failed'));
    await expect(
      service.removeEmployeeAvatar({ employeeId: 'employee-1' }),
    ).rejects.toBeInstanceOf(RpcException);

    employees.findOne.mockResolvedValue({ id: 'employee-1', avatar: null });
    cache.invalidateEmployeeCache.mockRejectedValueOnce(
      new Error('cache failed'),
    );
    await expect(
      service.removeEmployeeAvatar({ employeeId: 'employee-1' }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
