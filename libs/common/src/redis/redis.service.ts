import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUTH_CACHE_PREFIX,
  CACHE_PREFIX,
  CHAT_CACHE_PREFIX,
  JOB_CACHE_PREFIX,
  NOTIFICATION_CACHE_PREFIX,
  RESUME_CACHE_PREFIX,
  generateAuthSessionKey,
  generateCompanyKey,
  generateEmployeeKey,
  generateMatchingKey,
  generateNotificationUnreadCountKey,
  generateRecentChatsKey,
  generateTemplateDetailKey,
  generateTemplateListKey,
  generateUnreadCountKey,
  generateUserKey,
} from './redis-keys.util';

const CACHE_OPERATION_TIMEOUT_MS = 1_000;

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly PREFIX = CACHE_PREFIX;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Redis is an optimization, not a request-critical dependency. Keyv's Redis
   * adapter can keep retrying indefinitely when a local Redis instance is not
   * running, so bound basic cache operations and let callers use their source
   * of truth instead.
   */
  private async withOperationTimeout<T>(operation: Promise<T>): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const expiration = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Redis operation timed out')),
        CACHE_OPERATION_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([operation, expiration]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Cache key generators
  // Operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.withOperationTimeout(
        this.cacheManager.get<T>(key),
      );
      return value || null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache GET error: ${errorMessage}`);
      // A cache read failure is a cache miss: return the declared `null` and
      // let the caller fall through to its source of truth. Previously this
      // fell off the end as `undefined`, contradicting the signature.
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.withOperationTimeout(this.cacheManager.set(key, value, ttl));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache SET error: ${errorMessage}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.withOperationTimeout(this.cacheManager.del(key));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache DEL error: ${errorMessage}`);
    }
  }

  /**
   * Check-and-increment several fixed-window counters as ONE atomic operation.
   *
   * Every bucket is checked before any bucket is incremented, so a request
   * that trips the last bucket does not burn a slot in the earlier ones. Runs
   * as a Lua script, which Redis executes atomically — concurrent requests
   * cannot both read the same pre-increment value and both be allowed (the
   * read-modify-write this replaced let N parallel calls all slip through on
   * a limit of 1).
   *
   * Callers supply window-stamped keys (e.g. ending in `:2026-06-19` or a
   * numeric window index), so the TTL only garbage-collects the old key — the
   * logical window rolls over when the stamp changes.
   */
  private static readonly RATE_LIMIT_SCRIPT = `
    local n = #KEYS
    for i = 1, n do
      local current = tonumber(redis.call('GET', KEYS[i]) or '0')
      if current >= tonumber(ARGV[i * 2 - 1]) then
        return {0, i, current}
      end
    end
    for i = 1, n do
      local count = redis.call('INCR', KEYS[i])
      if count == 1 then
        redis.call('PEXPIRE', KEYS[i], ARGV[i * 2])
      end
    end
    return {1, 0, 0}
  `;

  /**
   * Resolve the underlying node-redis client from the Keyv store so we can run
   * commands cache-manager does not expose (EVAL, INCR). Returns null for
   * non-Redis stores (e.g. the in-memory store used by tests).
   */
  private resolveClient(): any | null {
    try {
      const stores = this.cacheManager.stores as any;
      const store = Array.isArray(stores) ? stores[0] : stores;
      return (
        store?.client ??
        store?.store?.client ??
        store?.getClient?.() ??
        store?.store?.getClient?.() ??
        (this.cacheManager as any).store?.getClient?.() ??
        null
      );
    } catch {
      return null;
    }
  }

  /**
   * Resolve clients exposed through an async getClient() API.
   *
   * @keyv/redis v5 returns a Promise from getClient(). Pattern invalidation
   * previously treated that Promise as the client, failed the `keys` feature
   * check, and fell back to clearing the whole cache.
   */
  private async resolveAsyncClient(): Promise<any | null> {
    try {
      const stores = this.cacheManager.stores as any;
      const store = Array.isArray(stores) ? stores[0] : stores;
      const getter =
        (typeof store?.getClient === 'function'
          ? () => store.getClient()
          : null) ??
        (typeof store?.store?.getClient === 'function'
          ? () => store.store.getClient()
          : null) ??
        (typeof (this.cacheManager as any).store?.getClient === 'function'
          ? () => (this.cacheManager as any).store.getClient()
          : null);

      // delPattern falls back here when getReadyClient() gives up, so this must
      // be bounded too — otherwise the timeout above just moves the hang.
      return getter
        ? await this.withOperationTimeout(Promise.resolve(getter()))
        : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis client discovery failed: ${errorMessage}`);
      return null;
    }
  }

  private connecting: Promise<void> | null = null;

  /**
   * Return the raw client only once it can actually accept commands.
   *
   * KeyvRedis connects lazily — it dials Redis on its own first get/set, so a
   * client fetched straight off the store is typically still closed. Issuing
   * EVAL against it throws `The client is closed`, which would land in the
   * fail-open catch and silently disable quota enforcement entirely. So we
   * connect it ourselves and return null (→ degraded fallback) if we can't.
   */
  private async getReadyClient(): Promise<any | null> {
    const client = this.resolveClient();
    if (!client) return null;
    if (client.isReady) return client;
    if (typeof client.connect !== 'function') return null;

    // node-redis rejects connect() on an already-opening socket, so concurrent
    // callers share a single in-flight attempt.
    if (!this.connecting) {
      this.connecting = (async () => {
        try {
          if (!client.isOpen) await client.connect();
        } finally {
          this.connecting = null;
        }
      })();
    }

    try {
      // Bounded for the same reason the basic operations are: node-redis keeps
      // retrying connect() with backoff when nothing is listening, and every
      // raw-client path (delPattern, hitRateLimits, getCounter) waits here. An
      // unbounded wait turns "Redis is down" into a request that hangs until
      // the caller's own timeout — a 30s page failure instead of a cache miss.
      await this.withOperationTimeout(this.connecting);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Redis connect for counters failed: ${errorMessage}`);
      return null;
    }

    return client.isReady ? client : null;
  }

  /**
   * Fails OPEN: if Redis is unreachable the request is allowed through, so an
   * infra blip degrades cost-protection rather than taking AI features offline.
   *
   * `failedIndex` is the zero-based index of the bucket that rejected, so the
   * caller can produce a message specific to the limit that was actually hit.
   */
  async hitRateLimits(
    buckets: { key: string; limit: number; ttlMs: number }[],
  ): Promise<{ allowed: boolean; failedIndex: number; count: number }> {
    if (buckets.length === 0) {
      return { allowed: true, failedIndex: -1, count: 0 };
    }

    try {
      const client = await this.getReadyClient();

      if (client && typeof client.eval === 'function') {
        const result = (await client.eval(RedisService.RATE_LIMIT_SCRIPT, {
          keys: buckets.map((bucket) => bucket.key),
          arguments: buckets.flatMap((bucket) => [
            String(bucket.limit),
            String(bucket.ttlMs),
          ]),
        })) as [number, number, number];

        const [allowed, failedPosition, count] = result;
        return {
          allowed: allowed === 1,
          failedIndex: allowed === 1 ? -1 : failedPosition - 1,
          count: Number(count),
        };
      }

      // Non-Redis store (tests, local memory cache): fall back to a best-effort
      // non-atomic check. Same semantics, just racy under concurrency.
      return await this.hitRateLimitsFallback(buckets);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Degrade to the cache-manager path before giving up: Keyv drives its own
      // connection there, so it often still works when our raw client does not.
      // Enforcing racily beats not enforcing at all.
      try {
        const degraded = await this.hitRateLimitsFallback(buckets);
        this.logger.warn(
          `Atomic rate counter failed (${errorMessage}); used non-atomic fallback`,
        );
        return degraded;
      } catch {
        this.logger.warn(
          `Rate counter unavailable, allowing request: ${errorMessage}`,
        );
        return { allowed: true, failedIndex: -1, count: 0 };
      }
    }
  }

  private async hitRateLimitsFallback(
    buckets: { key: string; limit: number; ttlMs: number }[],
  ): Promise<{ allowed: boolean; failedIndex: number; count: number }> {
    const counts = await Promise.all(
      buckets.map(async (bucket) =>
        this.normalizeCount(await this.cacheManager.get<number>(bucket.key)),
      ),
    );

    const failedIndex = counts.findIndex(
      (count, index) => count >= buckets[index].limit,
    );
    if (failedIndex !== -1) {
      return { allowed: false, failedIndex, count: counts[failedIndex] };
    }

    await Promise.all(
      buckets.map((bucket, index) =>
        this.cacheManager.set(bucket.key, counts[index] + 1, bucket.ttlMs),
      ),
    );
    return { allowed: true, failedIndex: -1, count: 0 };
  }

  /** Read a counter written by {@link hitRateLimits} without consuming it. */
  async getCounter(key: string): Promise<number> {
    try {
      const client = await this.getReadyClient();
      if (client && typeof client.get === 'function') {
        return this.normalizeCount(await client.get(key));
      }
      return this.normalizeCount(await this.cacheManager.get<number>(key));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Rate counter read failed: ${errorMessage}`);
      return 0;
    }
  }

  /** INCR stores counters as strings; cache-manager stores them as numbers. */
  private normalizeCount(value: unknown): number {
    const count = Number(value ?? 0);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  // Delete keys matching a pattern
  async delPattern(
    pattern: string,
    prefix: string = this.PREFIX,
  ): Promise<void> {
    try {
      const client =
        (await this.getReadyClient()) ?? (await this.resolveAsyncClient());
      if (!client) {
        this.logger.warn(
          `Cache store does not support pattern deletion; skipped ${prefix}:${pattern}`,
        );
        return;
      }

      const fullPattern = `${prefix}:${pattern}`;
      let deleted = 0;

      const deleteBatch = async (keys: string[]): Promise<void> => {
        if (keys.length === 0) return;
        if (typeof client.unlink === 'function') {
          await client.unlink(keys);
        } else {
          await Promise.all(keys.map((key) => this.del(key)));
        }
        deleted += keys.length;
      };

      // node-redis exposes scanIterator(), which avoids the blocking KEYS
      // command and lets us unlink matches in bounded batches.
      if (typeof client.scanIterator === 'function') {
        for await (const result of client.scanIterator({
          MATCH: fullPattern,
          COUNT: 100,
        })) {
          await deleteBatch(Array.isArray(result) ? result : [result]);
        }
      } else if (typeof client.scan === 'function') {
        let cursor = '0';
        do {
          const result = await client.scan(cursor, {
            MATCH: fullPattern,
            COUNT: 100,
          });
          cursor = String(result.cursor);
          await deleteBatch(result.keys ?? []);
        } while (cursor !== '0');
      } else if (typeof client.keys === 'function') {
        // Compatibility fallback for non-node-redis stores and test doubles.
        await deleteBatch(await client.keys(fullPattern));
      } else {
        this.logger.warn(
          `Redis client cannot scan keys; skipped ${fullPattern}`,
        );
        return;
      }

      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} keys matching ${fullPattern}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache DEL pattern error: ${errorMessage}`);
    }
  }

  // REPLACE pattern deletion with simple del calls
  async invalidateUser(userId: string): Promise<void> {
    // Instead of pattern deletion, delete specific known keys
    await Promise.all([
      this.del(generateUserKey('detail', userId)),
      this.del(generateUserKey('profile', userId)),
      this.del(generateUserKey('settings', userId)),
    ]);
  }

  async invalidateEmployee(employeeId: string): Promise<void> {
    await Promise.all([
      this.del(generateEmployeeKey('detail', employeeId)),
      this.del(generateEmployeeKey('favorites', employeeId)),
      this.del(generateEmployeeKey('favorite-count', employeeId)),
    ]);
  }

  async invalidateCompany(companyId: string): Promise<void> {
    await Promise.all([
      this.del(generateCompanyKey('detail', companyId)),
      this.del(generateCompanyKey('favorites', companyId)),
      this.del(generateCompanyKey('favorite-count', companyId)),
    ]);
  }

  // Helper for list invalidation (optional)
  async invalidateListPages(
    entity: string,
    pages: number[] = [1, 2, 3],
  ): Promise<void> {
    const promises = pages.map((page) =>
      this.del(`${this.PREFIX}:${entity}:list:page:${page}:limit:10`),
    );
    await Promise.all(promises);
  }

  // You can also clear profile/settings if you really use them
  async clearUserDetailCache(userId: string): Promise<void> {
    await this.del(generateUserKey('detail', userId));
  }

  // ===== AUTH SESSION KEYS =====
  private readonly AUTH_PREFIX = AUTH_CACHE_PREFIX;

  async invalidateAuthSession(userId: string): Promise<void> {
    await this.del(generateAuthSessionKey(userId));
  }

  // ===== JOB SERVICE KEYS =====
  private readonly JOB_PREFIX = JOB_CACHE_PREFIX;

  // Invalidate cached job searches and job lists. Job keys live under
  // JOB_PREFIX, so we must pass it explicitly to delPattern.
  async invalidateJobSearchCaches(): Promise<void> {
    await Promise.all([
      this.delPattern('job:search:*', this.JOB_PREFIX),
      this.delPattern('job:list:*', this.JOB_PREFIX),
    ]);
  }

  async invalidateMatchingCaches(eid: string, cid: string): Promise<void> {
    await Promise.all([
      this.del(generateMatchingKey('employee-liked', eid)),
      this.del(generateMatchingKey('company-liked', cid)),
      this.del(generateMatchingKey('employee-matching', eid)),
      this.del(generateMatchingKey('company-matching', cid)),
      this.del(generateMatchingKey('employee-matching-count', eid)),
      this.del(generateMatchingKey('company-matching-count', cid)),
    ]);
  }

  async invalidateMatchingProfileCaches(): Promise<void> {
    await this.delPattern('matching:*', this.JOB_PREFIX);
  }

  // ===== CHAT SERVICE KEYS =====
  private readonly CHAT_PREFIX = CHAT_CACHE_PREFIX;

  async invalidateChatCaches(userId1: string, userId2?: string): Promise<void> {
    const deletions = [
      this.del(generateRecentChatsKey(userId1)),
      this.del(generateUnreadCountKey(userId1)),
    ];
    if (userId2) {
      deletions.push(
        this.del(generateRecentChatsKey(userId2)),
        this.del(generateUnreadCountKey(userId2)),
      );
    }
    await Promise.all(deletions);
  }

  // ===== RESUME SERVICE KEYS =====
  private readonly RESUME_PREFIX = RESUME_CACHE_PREFIX;

  async invalidateTemplateCaches(templateId?: string): Promise<void> {
    const deletions: Promise<void>[] = [this.del(generateTemplateListKey())];
    if (templateId) {
      deletions.push(this.del(generateTemplateDetailKey(templateId)));
    }
    await Promise.all(deletions);
  }

  // ── Notification service ────────────────────────────────────────────
  private readonly NOTIFICATION_PREFIX = NOTIFICATION_CACHE_PREFIX;

  // A user's unread count and every cached list page change together on any
  // create / mark-read / delete, so drop them all for that user at once.
  async invalidateNotificationCaches(userId: string): Promise<void> {
    await Promise.all([
      this.del(generateNotificationUnreadCountKey(userId)),
      this.delPattern(`list:${userId}:*`, this.NOTIFICATION_PREFIX),
    ]);
  }
}
