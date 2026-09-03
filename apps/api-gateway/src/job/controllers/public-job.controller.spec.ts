import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { PublicJobController } from './public-job.controller';

describe('PublicJobController', () => {
  const send = jest.fn();
  const client = { send } as any;
  const controller = new PublicJobController(client);

  const respond = (value: unknown) => ({
    pipe: () => ({
      subscribe: (observer: any) => {
        observer.next(value);
        observer.complete();
      },
    }),
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns a job the service considers public', async () => {
    send.mockReturnValue(respond({ id: 'job-1', title: 'Engineer' }));

    await expect(controller.findOneJob('job-1')).resolves.toEqual({
      id: 'job-1',
      title: 'Engineer',
    });
    expect(send).toHaveBeenCalledWith(JOB_SERVICE.ACTIONS.FIND_ONE_JOB, {
      jobId: 'job-1',
    });
  });

  it('turns every non-public reason into one 404', async () => {
    send.mockReturnValue(respond(null));

    // Hidden, expired, suspended and non-existent must be indistinguishable:
    // anything else confirms to a scraper walking ids which ones were real.
    await expect(controller.findOneJob('job-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('passes the sitemap through untouched', async () => {
    const entries = [{ id: 'job-1', updatedAt: '2026-08-01T00:00:00.000Z' }];
    send.mockReturnValue(respond(entries));

    await expect(controller.findPublicJobSitemap()).resolves.toEqual(entries);
    expect(send).toHaveBeenCalledWith(
      JOB_SERVICE.ACTIONS.FIND_PUBLIC_JOB_SITEMAP,
      {},
    );
  });
});
