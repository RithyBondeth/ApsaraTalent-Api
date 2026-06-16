import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getMetrics } from './metrics';

/**
 * Prometheus scrape endpoint. On the gateway this exposes end-to-end HTTP
 * latency (http_request_duration_seconds); on each microservice it exposes that
 * service's RPC handler timings (rpc_handler_duration_seconds) plus Node process
 * metrics. p95 example:
 *   histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))
 *
 * Optionally protected: set METRICS_TOKEN and scrape with
 * `Authorization: Bearer <token>` (or `?token=`). Left open when unset (dev).
 */
@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = process.env.METRICS_TOKEN;
    if (token) {
      const auth = req.headers['authorization'];
      const provided =
        auth && auth.startsWith('Bearer ')
          ? auth.slice(7)
          : (req.query.token as string | undefined);
      if (provided !== token) throw new UnauthorizedException();
    }
    const { contentType, body } = await getMetrics();
    res.setHeader('Content-Type', contentType);
    res.send(body);
  }
}
