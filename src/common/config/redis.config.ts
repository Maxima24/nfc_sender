import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'bullmq';

/**
 * Builds the Redis connection options used by BullMQ.
 *
 * Two configuration styles are supported (use whichever your provider gives you):
 *
 *  1. A single connection URL via `REDIS_URL` — this is what most hosted Redis
 *     providers hand you (Upstash, Redis Cloud, Aiven, Railway, Render, ...).
 *     Use the `rediss://` scheme to enable TLS, e.g.
 *       REDIS_URL=rediss://default:<password>@<host>:<port>
 *
 *  2. Discrete variables:
 *       REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD
 *       REDIS_TLS=true   (enable TLS when the provider requires it)
 *
 * `REDIS_URL` takes precedence when it is set. When nothing is configured we
 * fall back to a local Redis on localhost:6379 for development.
 */
export function buildRedisConnection(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');

  if (url) {
    const parsed = new URL(url);
    return withBullDefaults({
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    });
  }

  const tlsEnabled = config.get<string>('REDIS_TLS') === 'true';
  return withBullDefaults({
    host: config.get<string>('REDIS_HOST') || 'localhost',
    port: Number(config.get<string>('REDIS_PORT')) || 6379,
    username: config.get<string>('REDIS_USERNAME') || undefined,
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    ...(tlsEnabled ? { tls: {} } : {}),
  });
}

function withBullDefaults(options: RedisOptions): RedisOptions {
  return {
    // BullMQ requires this to be null for its blocking commands / workers.
    maxRetriesPerRequest: null,
    ...options,
  };
}
