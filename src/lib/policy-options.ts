/**
 * Client-safe policy constants. Kept separate from `policy.ts` so Client
 * Components can import the options without pulling in the server-only
 * validation helpers.
 */
export const ALLOWED_DURATIONS = [15, 60, 240, 360] as const;
