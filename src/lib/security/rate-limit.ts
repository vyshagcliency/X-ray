import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** 5 audits per email domain per 30 days (sliding window) */
export const startRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "30 d"),
  prefix: "rl:start",
});

/** 10 uploads per IP per day */
export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"),
  prefix: "rl:upload",
});

/** 30 API requests per IP per minute */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:api",
});
