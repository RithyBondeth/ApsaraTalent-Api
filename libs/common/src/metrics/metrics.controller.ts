import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { getMetrics } from './metrics';

/**
 * Prometheus scrape endpoint. On the gateway this exposes end-to-end HTTP
 * latency (http_request_duration_seconds); on each microservice it exposes that
 * service's RPC handler timings (rpc_handler_duration_seconds) plus Node process
 * metrics. p95 example:
 *   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
 *
 * Protected with METRICS_TOKEN in production. Non-production remains open when
 * unset for local development. Tokens are accepted in the Authorization header
 * only so credentials never leak into URLs, browser history, or proxy logs.
 */
// Prometheus scrapes on a fixed interval from a fixed address; a rate limit
// here would only ever produce gaps in the monitoring data.
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = process.env.METRICS_TOKEN;
    if (!token && process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    if (token) {
      const auth = req.headers['authorization'];
      const provided = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
      if (provided !== token) throw new UnauthorizedException();
    }
    const { contentType, body } = await getMetrics();
    res.setHeader('Content-Type', contentType);
    res.send(body);
  }
}
