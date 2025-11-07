interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyPrefix?: string;
}

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: Date;
	retryAfter?: number;
}

interface BlocklistConfig {
	keyPrefix?: string;
	userBlocklistKey?: string;
	ipBlocklistKey?: string;
}

interface BlockedInfo {
	blocked: boolean;
	reason?: string;
	blockedAt?: Date;
}
