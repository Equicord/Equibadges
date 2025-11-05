import type { Redis } from "ioredis";

export interface BlocklistConfig {
	keyPrefix?: string;
	userBlocklistKey?: string;
	ipBlocklistKey?: string;
}

export interface BlockedInfo {
	blocked: boolean;
	reason?: string;
	blockedAt?: Date;
}

export class Blocklist {
	private redis: Redis;
	private config: Required<BlocklistConfig>;

	constructor(redis: Redis, config: BlocklistConfig = {}) {
		this.redis = redis;
		this.config = {
			keyPrefix: config.keyPrefix || "blocklist",
			userBlocklistKey:
				config.userBlocklistKey || `${config.keyPrefix || "blocklist"}:users`,
			ipBlocklistKey:
				config.ipBlocklistKey || `${config.keyPrefix || "blocklist"}:ips`,
		};
	}

	async isUserBlocked(userId: string): Promise<BlockedInfo> {
		try {
			const data = await this.redis.hget(this.config.userBlocklistKey, userId);
			if (!data) {
				return { blocked: false };
			}

			const blockInfo = JSON.parse(data);
			return {
				blocked: true,
				reason: blockInfo.reason,
				blockedAt: blockInfo.blockedAt
					? new Date(blockInfo.blockedAt)
					: undefined,
			};
		} catch {
			return { blocked: false };
		}
	}

	async isIpBlocked(ip: string): Promise<BlockedInfo> {
		try {
			const data = await this.redis.hget(this.config.ipBlocklistKey, ip);
			if (!data) {
				return { blocked: false };
			}

			const blockInfo = JSON.parse(data);
			return {
				blocked: true,
				reason: blockInfo.reason,
				blockedAt: blockInfo.blockedAt
					? new Date(blockInfo.blockedAt)
					: undefined,
			};
		} catch (_error) {
			return { blocked: false };
		}
	}

	async blockUser(userId: string, reason?: string): Promise<void> {
		const blockInfo = {
			reason: reason || "Blocked by administrator",
			blockedAt: new Date().toISOString(),
		};

		await this.redis.hset(
			this.config.userBlocklistKey,
			userId,
			JSON.stringify(blockInfo),
		);
	}

	async blockIp(ip: string, reason?: string): Promise<void> {
		const blockInfo = {
			reason: reason || "Blocked by administrator",
			blockedAt: new Date().toISOString(),
		};

		await this.redis.hset(
			this.config.ipBlocklistKey,
			ip,
			JSON.stringify(blockInfo),
		);
	}

	async unblockUser(userId: string): Promise<boolean> {
		const result = await this.redis.hdel(this.config.userBlocklistKey, userId);
		return result > 0;
	}

	async unblockIp(ip: string): Promise<boolean> {
		const result = await this.redis.hdel(this.config.ipBlocklistKey, ip);
		return result > 0;
	}

	async getBlockedUsers(): Promise<Record<string, BlockedInfo>> {
		const data = await this.redis.hgetall(this.config.userBlocklistKey);
		const result: Record<string, BlockedInfo> = {};

		for (const [userId, jsonData] of Object.entries(data)) {
			try {
				const blockInfo = JSON.parse(jsonData);
				result[userId] = {
					blocked: true,
					reason: blockInfo.reason,
					blockedAt: blockInfo.blockedAt
						? new Date(blockInfo.blockedAt)
						: undefined,
				};
			} catch (_error) {}
		}

		return result;
	}

	async getBlockedIps(): Promise<Record<string, BlockedInfo>> {
		const data = await this.redis.hgetall(this.config.ipBlocklistKey);
		const result: Record<string, BlockedInfo> = {};

		for (const [ip, jsonData] of Object.entries(data)) {
			try {
				const blockInfo = JSON.parse(jsonData);
				result[ip] = {
					blocked: true,
					reason: blockInfo.reason,
					blockedAt: blockInfo.blockedAt
						? new Date(blockInfo.blockedAt)
						: undefined,
				};
			} catch (_error) {}
		}

		return result;
	}

	async clearUserBlocklist(): Promise<void> {
		await this.redis.del(this.config.userBlocklistKey);
	}

	async clearIpBlocklist(): Promise<void> {
		await this.redis.del(this.config.ipBlocklistKey);
	}
}
