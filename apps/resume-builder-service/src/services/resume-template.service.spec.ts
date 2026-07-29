import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { ResumeTemplateService } from './resume-template.service';

describe('ResumeTemplateService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const uploads = { getUploadFile: jest.fn() };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    generateTemplateListKey: jest.fn(() => 'templates'),
    generateTemplateDetailKey: jest.fn((id) => `template:${id}`),
    generateTemplateSearchKey: jest.fn(() => 'template-search'),
    get: jest.fn(),
    set: jest.fn(),
    invalidateTemplateCaches: jest.fn(),
  };
  const service = new ResumeTemplateService(
    repository as any,
    uploads as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    repository.save.mockReset().mockResolvedValue({});
    redis.invalidateTemplateCaches.mockReset().mockResolvedValue(undefined);
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

  it('returns a cached template list without querying storage', async () => {
    const cached = [{ id: 'template-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAllResumeTemplate()).resolves.toBe(cached);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('loads and caches all templates on a cache miss', async () => {
    repository.find.mockResolvedValue([{ id: 'template-1', title: 'Classic' }]);
    const result = await service.findAllResumeTemplate();
    expect(result).toHaveLength(1);
    expect(redis.set).toHaveBeenCalledWith(
      'templates',
      result,
      expect.any(Number),
    );
  });

  it('returns cached details and preserves a missing-template 404', async () => {
    redis.get.mockResolvedValueOnce({ id: 'template-1' });
    await expect(service.findOneResumeTemplate('template-1')).resolves.toEqual({
      id: 'template-1',
    });

    redis.get.mockResolvedValueOnce(null);
    repository.findOne.mockResolvedValue(null);
    await expectRpc(
      service.findOneResumeTemplate('missing'),
      404,
      'There are no templates available with this id.',
    );
  });

  it('normalizes creation fields, stores an image, and invalidates caches', async () => {
    uploads.getUploadFile.mockReturnValue('/templates/preview.png');
    const image = { filename: 'preview.png' } as Express.Multer.File;
    await service.createResumeTemplate(
      {
        templateKey: 'classic',
        title: 'Classic',
        description: 'Simple layout',
        price: '9.99' as any,
        isPremium: true,
      },
      image,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 9.99, isPremium: true }),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ image: '/templates/preview.png' }),
    );
    expect(redis.invalidateTemplateCaches).toHaveBeenCalled();
  });

  it('returns conflict for a duplicate template key', async () => {
    repository.save.mockRejectedValue({ code: '23505' });
    await expectRpc(
      service.createResumeTemplate(
        { templateKey: 'classic', title: 'Classic' } as any,
        undefined as any,
      ),
      409,
      'A resume template with this key already exists.',
    );
  });

  function queryBuilder(templates: any[]) {
    const query: Record<string, jest.Mock> = {};
    query.where = jest.fn(() => query);
    query.andWhere = jest.fn(() => query);
    query.getMany = jest.fn().mockResolvedValue(templates);
    return query;
  }

  it('searches by title and premium status and caches the result', async () => {
    const query = queryBuilder([{ id: 'template-1', title: 'Classic' }]);
    repository.createQueryBuilder.mockReturnValue(query);
    const result = await service.searchResumeTemplate({
      title: 'classic',
      isPremium: 'true' as any,
    });
    expect(query.where).toHaveBeenCalledWith('resume.title ILIKE :title', {
      title: '%classic%',
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      'resume.isPremium = :isPremium',
      { isPremium: true },
    );
    expect(redis.set).toHaveBeenCalledWith(
      'template-search',
      result,
      expect.any(Number),
    );
  });

  it('returns 404 when no template matches a search', async () => {
    repository.createQueryBuilder.mockReturnValue(queryBuilder([]));
    await expectRpc(
      service.searchResumeTemplate({ title: 'missing', isPremium: false }),
      404,
      'No templates found matching your criteria.',
    );
  });

  it('wraps unexpected repository failures as internal RPC errors', async () => {
    repository.find.mockRejectedValue(new Error('database unavailable'));
    await expectRpc(
      service.findAllResumeTemplate(),
      500,
      'database unavailable',
    );
  });

  it('loads and caches one template and wraps detail database failures', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 'template-1',
      title: 'Classic',
    });
    await expect(
      service.findOneResumeTemplate('template-1'),
    ).resolves.toMatchObject({
      id: 'template-1',
      title: 'Classic',
    });
    expect(redis.set).toHaveBeenCalledWith(
      'template:template-1',
      expect.anything(),
      expect.any(Number),
    );

    repository.findOne.mockRejectedValueOnce(new Error('detail failed'));
    await expectRpc(
      service.findOneResumeTemplate('template-2'),
      500,
      'detail failed',
    );
  });

  it('creates a free non-premium template without an image', async () => {
    repository.save.mockResolvedValue({});
    await service.createResumeTemplate(
      { templateKey: 'free', title: 'Free', price: 'invalid' as any } as any,
      undefined as any,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: 0, isPremium: false }),
    );
    expect(uploads.getUploadFile).not.toHaveBeenCalled();
  });

  it('wraps image storage, repository, and cache invalidation failures', async () => {
    uploads.getUploadFile.mockImplementationOnce(() => {
      throw new Error('storage failed');
    });
    await expectRpc(
      service.createResumeTemplate(
        { templateKey: 'x', title: 'X' } as any,
        { filename: 'x.png' } as any,
      ),
      500,
      'storage failed',
    );

    redis.invalidateTemplateCaches.mockRejectedValueOnce(
      new Error('cache failed'),
    );
    await expectRpc(
      service.createResumeTemplate(
        { templateKey: 'y', title: 'Y' } as any,
        undefined as any,
      ),
      500,
      'cache failed',
    );
  });

  it('returns cached searches and supports premium-only searches', async () => {
    redis.get.mockResolvedValueOnce([{ id: 'cached' }]);
    await expect(
      service.searchResumeTemplate({ title: '', isPremium: true }),
    ).resolves.toEqual([{ id: 'cached' }]);
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();

    redis.get.mockResolvedValueOnce(null);
    const query = queryBuilder([{ id: 'template-1', isPremium: false }]);
    repository.createQueryBuilder.mockReturnValue(query);
    await service.searchResumeTemplate({ title: '', isPremium: false });
    expect(query.where).toHaveBeenCalledWith('resume.isPremium = :isPremium', {
      isPremium: false,
    });
  });

  it('wraps unexpected search database failures', async () => {
    repository.createQueryBuilder.mockImplementationOnce(() => {
      throw new Error('search failed');
    });
    await expectRpc(
      service.searchResumeTemplate({ title: 'x', isPremium: false }),
      500,
      'search failed',
    );
  });

  it('uses stable fallbacks for null repository failures', async () => {
    repository.find.mockRejectedValueOnce(null);
    await expectRpc(
      service.findAllResumeTemplate(),
      500,
      "An error occurred while fetching all resume's templates.",
    );

    repository.findOne.mockRejectedValueOnce(null);
    await expectRpc(
      service.findOneResumeTemplate('template-1'),
      500,
      "An error occurred while fetching a resume's templates.",
    );

    repository.save.mockRejectedValueOnce(null);
    await expectRpc(
      service.createResumeTemplate(
        {
          templateKey: 'classic',
          title: 'Classic',
          description: 'Template',
        } as any,
        undefined as any,
      ),
      500,
      "An error occurred while creating the resume's template.",
    );

    const query = { getMany: jest.fn().mockRejectedValue(null) };
    repository.createQueryBuilder.mockReturnValueOnce(query);
    await expectRpc(
      service.searchResumeTemplate({} as any),
      500,
      "An error occurred while searching the resume's templates.",
    );
  });
});
