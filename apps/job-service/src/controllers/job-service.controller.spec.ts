import 'reflect-metadata';
import { JobController } from './job-service.controller';

describe('Job-service RPC controller', () => {
  it('delegates list and search payloads unchanged', async () => {
    const service = {
      findAllJobs: jest.fn().mockResolvedValue([]),
      searchJobs: jest.fn().mockResolvedValue({ jobs: [], total: 0 }),
    };
    const controller = new JobController(service as any);
    const pagination = { skip: 5, limit: 10 } as any;
    const search = { query: 'developer', page: 2 } as any;
    await controller.findAllJobs(pagination);
    await controller.searchJobs(search);
    expect(service.findAllJobs).toHaveBeenCalledWith(pagination);
    expect(service.searchJobs).toHaveBeenCalledWith(search);
  });
});
