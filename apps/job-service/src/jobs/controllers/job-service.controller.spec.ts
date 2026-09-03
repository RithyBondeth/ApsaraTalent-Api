import 'reflect-metadata';
import { JobController } from './job-service.controller';

describe('Job-service RPC controller', () => {
  it('delegates list, search, detail and sitemap payloads unchanged', async () => {
    const service = {
      findAllJobs: jest.fn().mockResolvedValue([]),
      searchJobs: jest.fn().mockResolvedValue({ jobs: [], total: 0 }),
      findOneJob: jest.fn().mockResolvedValue(null),
      findPublicJobSitemap: jest.fn().mockResolvedValue([]),
    };
    const controller = new JobController(service as any);
    const pagination = { skip: 5, limit: 10 } as any;
    const search = { query: 'developer', page: 2 } as any;
    await controller.findAllJobs(pagination);
    await controller.searchJobs(search);
    await controller.findOneJob({ jobId: 'job-1' } as any);
    await controller.findPublicJobSitemap();
    expect(service.findAllJobs).toHaveBeenCalledWith(pagination);
    expect(service.searchJobs).toHaveBeenCalledWith(search);
    expect(service.findOneJob).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(service.findPublicJobSitemap).toHaveBeenCalled();
  });
});
