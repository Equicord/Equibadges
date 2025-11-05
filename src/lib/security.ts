import { rateLimitConfig } from "@config";
import { Blocklist } from "@lib/blocklist";
import { RateLimiter } from "@lib/rateLimit";
import { redis } from "bun";

export const blocklist = new Blocklist(redis);
export const rateLimiter = new RateLimiter(redis, {
	windowMs: rateLimitConfig.windowMs,
	maxRequests: rateLimitConfig.maxRequests,
});
