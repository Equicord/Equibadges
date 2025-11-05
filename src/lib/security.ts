import { rateLimitConfig } from "@config";
import { Blocklist } from "@lib/blocklist";
import { RateLimiter } from "@lib/rateLimit";
import { redis } from "bun";

let blocklistInstance: Blocklist | null = null;
let rateLimiterInstance: RateLimiter | null = null;

function getBlocklist(): Blocklist {
	if (!blocklistInstance) {
		blocklistInstance = new Blocklist(redis);
	}
	return blocklistInstance;
}

function getRateLimiter(): RateLimiter {
	if (!rateLimiterInstance) {
		rateLimiterInstance = new RateLimiter(redis, {
			windowMs: rateLimitConfig.windowMs,
			maxRequests: rateLimitConfig.maxRequests,
		});
	}
	return rateLimiterInstance;
}

export const blocklist = new Proxy({} as Blocklist, {
	get(_target, prop) {
		return getBlocklist()[prop as keyof Blocklist];
	},
});

export const rateLimiter = new Proxy({} as RateLimiter, {
	get(_target, prop) {
		return getRateLimiter()[prop as keyof RateLimiter];
	},
});
