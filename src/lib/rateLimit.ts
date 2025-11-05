import type { redis } from "bun";

export type Redis = typeof redis;

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

		try {
			// Simple counter-based rate limiting with expiry
			const countStr = await this.redis.get(key);
			const count = countStr ? Number.parseInt(countStr, 10) : 0;

			if (count >= this.config.maxRequests) {
				const resetAt = new Date(now + this.config.windowMs);
				return {
					allowed: false,
					remaining: 0,
					resetAt,
					retryAfter: Math.ceil(this.config.windowMs / 1000),
				};
			}

			// Increment counter
			const newCount = count + 1;
			await this.redis.set(key, newCount.toString());

			// Set expiry on first request
			if (count === 0) {
				await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000));
			}

			const remaining = this.config.maxRequests - newCount;
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
		const countStr = await this.redis.get(key);
		return countStr ? Number.parseInt(countStr, 10) : 0;
	}
}
