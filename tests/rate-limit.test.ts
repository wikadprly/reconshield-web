import { describe, expect, it } from "vitest";

import { createRateLimiter } from "@/lib/rate-limit";

function clock(start = 0) {
  let value = start;
  return {
    now: () => value,
    advance: (ms: number) => {
      value += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: time.now });

    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);

    const refused = limiter.tryAcquire();
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterMs).toBe(60_000);
    expect(limiter.size()).toBe(3);
  });

  it("reports how long to wait until the oldest slot expires", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: time.now });

    expect(limiter.tryAcquire().allowed).toBe(true);
    time.advance(20_000);
    expect(limiter.tryAcquire().retryAfterMs).toBe(40_000);
  });

  it("frees slots as they slide out of the window", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });

    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire().allowed).toBe(false);

    time.advance(30_000);
    expect(limiter.tryAcquire().allowed).toBe(false);

    time.advance(30_000);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(false);
  });

  it("never drops below a single permitted slot and can be reset", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 0, windowMs: 1_000, now: time.now });

    expect(limiter.tryAcquire().allowed).toBe(true);
    expect(limiter.tryAcquire().allowed).toBe(false);

    limiter.reset();
    expect(limiter.size()).toBe(0);
    expect(limiter.tryAcquire().allowed).toBe(true);
  });
});
