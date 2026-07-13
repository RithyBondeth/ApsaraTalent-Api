import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';

/**
 * Registers GET /metrics. Import in the gateway and in every microservice
 * (which now run as hybrid apps with a small HTTP server) so each process is
 * independently scrapeable by Prometheus.
 */
@Module({
  controllers: [MetricsController],
})
export class MetricsModule {}
