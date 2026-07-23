import 'reflect-metadata';
import { JOB_SERVICE } from '@app/contracts';
import { rpcCall } from '../../utils/rpc-call';
import { JobController } from './job.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('JobController', () => {
  const client = {};
  const controller = new JobController(client as any);

  beforeEach(() => jest.clearAllMocks());

  it('applies default and explicit job pagination', async () => {
    (rpcCall as jest.Mock).mockResolvedValue([]);
    await controller.findAllJobs({});
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
      {
        skip: 0,
        limit: 20,
      },
    );
    await controller.findAllJobs({ skip: 5, limit: 10 });
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
      {
        skip: 5,
        limit: 10,
      },
    );
  });

  it('normalizes numeric search filters and includes the requester', async () => {
    (rpcCall as jest.Mock).mockResolvedValue({ jobs: [], total: 0 });
    await controller.searchJobs(
      { id: 'user-1' } as any,
      {
        query: 'developer',
        companySizeMin: '10',
        companySizeMax: '100',
        salaryMin: '1000',
        salaryMax: '2000',
        page: '2',
        pageSize: '25',
      } as any,
    );
    expect(rpcCall).toHaveBeenCalledWith(
      client,
      JOB_SERVICE.ACTIONS.SEARCH_JOBS,
      expect.objectContaining({
        companySizeMin: 10,
        companySizeMax: 100,
        salaryMin: 1000,
        salaryMax: 2000,
        page: 2,
        pageSize: 25,
        requesterId: 'user-1',
      }),
      20_000,
    );
  });
});
