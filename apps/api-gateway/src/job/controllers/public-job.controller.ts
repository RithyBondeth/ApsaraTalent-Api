import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  PublicJobDetailDTO,
  PublicJobSitemapEntryDTO,
} from '@app/contracts/dtos/job';
import { IPublicJobController } from '@app/contracts/interfaces/controller/job-controllers/job-controller.interface';
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { rpcCall } from '../../utils/rpc-call';

/**
 * The unauthenticated job surface.
 *
 * Separate from `JobController` deliberately. Every other route in this feature
 * is behind `AuthGuard`, and a public route sitting among them is one
 * copy-pasted decorator away from being quietly authenticated — or, worse, an
 * authenticated route one deleted decorator away from being public. Keeping the
 * anonymous routes in their own file makes "what can the world see" a question
 * you answer by opening one file.
 *
 * What each route may return is decided in `JobService.findOneJob`, which is
 * where the hidden/expired/suspended rules live.
 */
@Controller('public/job')
export class PublicJobController implements IPublicJobController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  /**
   * Throttled harder than the authenticated routes because there is no account
   * behind a caller here — this is the cheapest endpoint on the platform to
   * enumerate, and it returns a whole posting per call.
   */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':jobId')
  async findOneJob(
    // Rejects a non-UUID before it reaches a service and a database round
    // trip — the id is in a public URL, so malformed ones are guaranteed.
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ): Promise<PublicJobDetailDTO> {
    const job = await rpcCall<PublicJobDetailDTO | null>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_ONE_JOB,
      { jobId },
    );

    // One 404 for every reason a job is not public. Saying "this posting was
    // removed" instead would confirm the id was real, which is the one thing a
    // scraper walking ids wants to know.
    if (!job) throw new NotFoundException('Job not found');

    return job;
  }

  /**
   * Feeds `app/sitemap.ts` in the web app. Cached for an hour in job-service,
   * so the crawl budget of every search engine put together costs one query.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('sitemap/entries')
  async findPublicJobSitemap(): Promise<PublicJobSitemapEntryDTO[]> {
    return rpcCall<PublicJobSitemapEntryDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_PUBLIC_JOB_SITEMAP,
      {},
    );
  }
}
