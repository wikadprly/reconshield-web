/**
 * Tiny sliding-window rate limiter for RouterOS write operations.
 *
 * The window is a rolling list of reserved timestamps; `now` is injectable so
 * the behaviour is deterministic in tests. It exists so
 * `RECONSHIELD_MAX_ROUTER_WRITES_PER_MINUTE` is actually enforced instead of
 * being a decorative setting.
 */
export interface RateLimitDecision {
  allowed: boolean;
  /** Milliseconds to wait before the next attempt when `allowed` is false. */
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs?: number;
  now?: () => number;
}

export function createRateLimiter({ limit, windowMs = 60_000, now = Date.now }: RateLimiterOptions) {
  const attempts: number[] = [];
  const cap = Math.max(1, Math.floor(limit));

  function prune(current: number): void {
    const cutoff = current - windowMs;
    while (attempts.length > 0 && attempts[0]! <= cutoff) attempts.shift();
  }

  return {
    /** Reserve one slot in the window, or report how long to wait. */
    tryAcquire(): RateLimitDecision {
      const current = now();
      prune(current);
      if (attempts.length >= cap) {
        const oldest = attempts[0]!;
        return { allowed: false, retryAfterMs: Math.max(0, oldest + windowMs - current) };
      }
      attempts.push(current);
      return { allowed: true, retryAfterMs: 0 };
    },
    /** Current number of reserved slots (diagnostics and tests). */
    size(): number {
      prune(now());
      return attempts.length;
    },
    reset(): void {
      attempts.length = 0;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
