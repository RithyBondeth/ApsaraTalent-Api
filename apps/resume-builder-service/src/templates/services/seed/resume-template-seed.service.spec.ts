import {
  RESUME_TEMPLATE_SEEDS,
  ResumeTemplateSeedService,
} from './resume-template-seed.service';

describe('ResumeTemplateSeedService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };
  const redis = { invalidateTemplateCaches: jest.fn() };
  const service = new ResumeTemplateSeedService(
    repository as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (value) => value);
  });

  it('creates every missing built-in template and invalidates caches', async () => {
    repository.findOne.mockResolvedValue(null);
    await service.onModuleInit();
    expect(repository.create).toHaveBeenCalledTimes(
      RESUME_TEMPLATE_SEEDS.length,
    );
    expect(repository.save).toHaveBeenCalledTimes(RESUME_TEMPLATE_SEEDS.length);
    expect(redis.invalidateTemplateCaches).toHaveBeenCalled();
  });

  it('updates existing seed records without duplicating them', async () => {
    repository.findOne.mockImplementation(async ({ where }) => ({
      id: `existing-${where[0].templateKey}`,
      title: 'Old title',
    }));
    await service.onModuleInit();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('existing-'),
        templateKey: 'modern',
      }),
    );
  });

  it('contains seeding failures so application startup continues', async () => {
    repository.findOne.mockRejectedValue(new Error('database unavailable'));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Failed to seed resume templates',
    );
  });
});
