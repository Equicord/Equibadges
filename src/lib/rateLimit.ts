import type { redis } from "bun";

export type Redis = typeof redis;

export class RateLimiter {
	private redis: Redis;
	private config: Required<RateLimitConfig>;

	constructor(redis: Redis, config: RateLimitConfig) {
		this.redis = redis;
		this.config = {
			windowMs: config.windowMs,
			maxRequests: config.maxRequests,
			keyPrefix: config.keyPrefix || "rate_limit",
		};
	}

	async checkLimit(identifier: string): Promise<RateLimitResult> {
		const key = `${this.config.keyPrefix}:${identifier}`;
		const now = Date.now();
		const windowSeconds = Math.ceil(this.config.windowMs / 1000);

		try {
			const newCount = await this.redis.incr(key);

			if (newCount === 1) {
				await this.redis.expire(key, windowSeconds);
			}

			const ttl = await this.redis.ttl(key);
			const resetAt =
				ttl > 0
					? new Date(now + ttl * 1000)
					: new Date(now + this.config.windowMs);

			if (newCount > this.config.maxRequests) {
				return {
					allowed: false,
					remaining: 0,
					resetAt,
					retryAfter: ttl > 0 ? ttl : windowSeconds,
				};
			}

			const remaining = this.config.maxRequests - newCount;

			return {
				allowed: true,
				remaining,
				resetAt,
			};
		} catch (_error) {
			return {
				allowed: true,
				remaining: this.config.maxRequests,
				resetAt: new Date(now + this.config.windowMs),
			};
		}
	}

	async reset(identifier: string): Promise<void> {
		const key = `${this.config.keyPrefix}:${identifier}`;
		await this.redis.del(key);
	}

	async getCount(identifier: string): Promise<number> {
		const key = `${this.config.keyPrefix}:${identifier}`;
		const countStr = await this.redis.get(key);
		return countStr ? Number.parseInt(countStr, 10) : 0;
	}
}
