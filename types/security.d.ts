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
