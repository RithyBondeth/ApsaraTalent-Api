import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Gauge, register } from 'prom-client';

/**
 * Exposes the pg connection-pool state as Prometheus gauges. The pool is the
 * scarcest resource on a remote (Neon) database — when it saturates, requests
 * queue and latency spikes — but TypeORM/pg don't emit metrics for it, so we
 * read the live counts off the driver's pool at scrape time.
 *
 * No `service` label is added: each process has one pool and Prometheus already
 * attaches a `service` target label.
 */
@Injectable()
export class DbPoolMetrics implements OnModuleInit {
  private readonly logger = new Logger(DbPoolMetrics.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    // PostgresDriver keeps the node-postgres Pool on `.master` (no replication).
    const pool = (this.dataSource.driver as any)?.master;
    if (!pool || typeof pool.totalCount === 'undefined') {
      this.logger.warn(
        'DB pool metrics unavailable: pg pool not found on the datasource driver',
      );
      return;
    }

    const define = (name: string, help: string, read: () => number) => {
      // Guard against double registration (defensive — one pool per process).
      if (register.getSingleMetric(name)) return;
      new Gauge({
        name,
        help,
        registers: [register],
        collect() {
          this.set(read());
        },
      });
    };

    define(
      'db_pool_connections_total',
      'Total connections in the pg pool (in use + idle).',
      () => pool.totalCount ?? 0,
    );
    define(
      'db_pool_connections_idle',
      'Idle connections in the pg pool.',
      () => pool.idleCount ?? 0,
    );
    define(
      'db_pool_connections_waiting',
      'Requests waiting to acquire a connection from the pg pool.',
      () => pool.waitingCount ?? 0,
    );

    const max =
      pool.options?.max ??
      Number((this.dataSource.options as any)?.extra?.max) ??
      0;
    define('db_pool_max', 'Configured maximum size of the pg pool.', () => max);

    this.logger.log(`DB pool metrics registered (max=${max})`);
  }
}
