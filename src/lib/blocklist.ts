import type { redis } from "bun";

export type Redis = typeof redis;

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
			const result: BlockedInfo = {
				blocked: true,
				reason: blockInfo.reason,
			};
			if (blockInfo.blockedAt) {
				result.blockedAt = new Date(blockInfo.blockedAt);
			}
			return result;
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
			const result: BlockedInfo = {
				blocked: true,
				reason: blockInfo.reason,
			};
			if (blockInfo.blockedAt) {
				result.blockedAt = new Date(blockInfo.blockedAt);
			}
			return result;
		} catch (_error) {
			return { blocked: false };
		}
	}

	async blockUser(userId: string, reason?: string): Promise<void> {
		const blockInfo = {
			reason: reason || "Blocked by administrator",
			blockedAt: new Date().toISOString(),
		};

		await this.redis.hmset(this.config.userBlocklistKey, [
			userId,
			JSON.stringify(blockInfo),
		]);
	}

	async blockIp(ip: string, reason?: string): Promise<void> {
		const blockInfo = {
			reason: reason || "Blocked by administrator",
			blockedAt: new Date().toISOString(),
		};

		await this.redis.hmset(this.config.ipBlocklistKey, [
			ip,
			JSON.stringify(blockInfo),
		]);
	}

	async unblockUser(userId: string): Promise<boolean> {
		const result = await this.redis.send("HDEL", [
			this.config.userBlocklistKey,
			userId,
		]);
		return (result as number) > 0;
	}

	async unblockIp(ip: string): Promise<boolean> {
		const result = await this.redis.send("HDEL", [
			this.config.ipBlocklistKey,
			ip,
		]);
		return (result as number) > 0;
	}

	async getBlockedUsers(): Promise<Record<string, BlockedInfo>> {
		const data = (await this.redis.send("HGETALL", [
			this.config.userBlocklistKey,
		])) as string[] | null;
		const result: Record<string, BlockedInfo> = {};

		if (!data || data.length === 0) return result;

		for (let i = 0; i < data.length; i += 2) {
			const userId = data[i];
			const jsonData = data[i + 1];
			if (userId && jsonData) {
				try {
					const blockInfo = JSON.parse(jsonData);
					const info: BlockedInfo = {
						blocked: true,
						reason: blockInfo.reason,
					};
					if (blockInfo.blockedAt) {
						info.blockedAt = new Date(blockInfo.blockedAt);
					}
					result[userId] = info;
				} catch (_error) {}
			}
		}

		return result;
	}

	async getBlockedIps(): Promise<Record<string, BlockedInfo>> {
		const data = (await this.redis.send("HGETALL", [
			this.config.ipBlocklistKey,
		])) as string[] | null;
		const result: Record<string, BlockedInfo> = {};

		if (!data || data.length === 0) return result;

		for (let i = 0; i < data.length; i += 2) {
			const ip = data[i];
			const jsonData = data[i + 1];
			if (ip && jsonData) {
				try {
					const blockInfo = JSON.parse(jsonData);
					const info: BlockedInfo = {
						blocked: true,
						reason: blockInfo.reason,
					};
					if (blockInfo.blockedAt) {
						info.blockedAt = new Date(blockInfo.blockedAt);
					}
					result[ip] = info;
				} catch (_error) {}
			}
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
