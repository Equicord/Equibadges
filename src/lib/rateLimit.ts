import type { Redis } from "ioredis";

export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyPrefix?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
	retryAfter?: number;
}

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
		const windowStart = now - this.config.windowMs;

		try {
			await this.redis.zremrangebyscore(key, "-inf", windowStart.toString());
			const count = await this.redis.zcard(key);

			if (count >= this.config.maxRequests) {
				const oldestEntry = await this.redis.zrange(key, 0, 0, "WITHSCORES");
				const resetTime =
					oldestEntry.length > 1
						? Number.parseInt(oldestEntry[1], 10) + this.config.windowMs
						: now + this.config.windowMs;

				return {
					allowed: false,
					remaining: 0,
					resetAt: new Date(resetTime),
					retryAfter: Math.ceil((resetTime - now) / 1000),
				};
			}

			await this.redis.zadd(key, now.toString(), `${now}-${Math.random()}`);
			await this.redis.pexpire(key, this.config.windowMs);

			const remaining = this.config.maxRequests - (count + 1);
			const resetAt = new Date(now + this.config.windowMs);

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
		const now = Date.now();
		const windowStart = now - this.config.windowMs;

		await this.redis.zremrangebyscore(key, "-inf", windowStart.toString());
		return await this.redis.zcard(key);
	}
}
