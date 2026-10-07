import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ResumeDraft } from '@app/common/database/entities/resume-draft.entity';
import { AuthenticatedUser } from '@app/common/guards/auth.guard';
import {
  ResumeDraftController,
  CreateResumeDraftDTO,
  UpdateResumeDraftDTO,
} from './resume-draft.controller';

describe('Resume drafts', () => {
  const content = {
    personalInfo: { fullName: '' },
    skills: [],
    experience: [],
    template: 'modern',
  };
  const request = { user: { id: 'owner' } as AuthenticatedUser };
  const id = '880805a8-fd1d-47e3-88bc-1201542b2f94';
  let controller: ResumeDraftController;
  let repo: any;
  let query: any;
  beforeEach(() => {
    query = {};
    for (const method of [
      'insert',
      'into',
      'values',
      'orIgnore',
      'update',
      'set',
      'where',
      'returning',
      'setParameter',
    ])
      query[method] = jest.fn().mockReturnValue(query);
    query.execute = jest
      .fn()
      .mockResolvedValue({ affected: 1, raw: [{ id, content, revision: 2 }] });
    repo = {
      createQueryBuilder: () => query,
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id, content, name: 'Resume', revision: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    controller = new ResumeDraftController(repo as Repository<ResumeDraft>);
  });

  it('scopes every list, read and delete to the authenticated account', async () => {
    await controller.list(request);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner' } }),
    );
    await controller.read(request, id);
    expect(repo.findOneBy).toHaveBeenCalledWith({ id, userId: 'owner' });
    await controller.remove(request, id);
    expect(repo.delete).toHaveBeenCalledWith({ id, userId: 'owner' });
  });

  it('does not expose a missing or foreign draft', async () => {
    repo.findOneBy.mockResolvedValue(null);
    repo.delete.mockResolvedValue({ affected: 0 });
    await expect(controller.read(request, id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.remove(request, id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates incomplete drafts with a stable retry id and server-owned user id', async () => {
    const dto = { id, name: 'Resume', content };
    await controller.create(request, dto);
    await controller.create(request, dto);
    expect(query.values).toHaveBeenCalledWith({
      id,
      name: 'Resume',
      userId: 'owner',
      content: expect.any(Function),
    });
    expect(query.values.mock.calls[0][0].content()).toBe(':content::jsonb');
    expect(query.setParameter).toHaveBeenCalledWith(
      'content',
      JSON.stringify(content),
    );
    expect(query.orIgnore).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of a creation id for different content', async () => {
    await expect(
      controller.create(request, { id, name: 'Different', content }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('atomically checks owner and revision when saving', async () => {
    await controller.update(request, id, {
      name: 'Resume',
      content,
      revision: 1,
    });
    expect(query.where).toHaveBeenCalledWith(
      expect.stringContaining('"revision" = :revision'),
      { id, userId: 'owner', revision: 1 },
    );
    expect(query.set.mock.calls[0][0].revision()).toBe('"revision" + 1');
    expect(query.set.mock.calls[0][0].content()).toBe(':content::jsonb');
  });

  it('rejects stale writes but accepts an identical retry after a lost response', async () => {
    query.execute.mockResolvedValue({ affected: 0 });
    repo.findOneBy.mockResolvedValue({ name: 'Resume', content, revision: 2 });
    await expect(
      controller.update(request, id, {
        name: 'Other edits',
        content,
        revision: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      controller.update(request, id, { name: 'Resume', content, revision: 1 }),
    ).resolves.toMatchObject({ revision: 2 });
  });

  it('rejects invalid and oversized content before writing', async () => {
    for (const bad of [{}, { ...content, summary: 'x'.repeat(2000001) }]) {
      await expect(
        controller.create(request, { id, name: 'Resume', content: bad }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(query.execute).not.toHaveBeenCalled();
  });

  it('validates names, IDs, revisions and rejects caller-supplied ownership', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    for (const data of [
      { id, name: '', content },
      { id: 'invalid', name: 'Resume', content },
      { id, name: 'Resume', content, userId: 'someone' },
    ]) {
      await expect(
        pipe.transform(data, { type: 'body', metatype: CreateResumeDraftDTO }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      pipe.transform(
        { name: 'Resume', content, revision: 0 },
        { type: 'body', metatype: UpdateResumeDraftDTO },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
