type Badge = {
	tooltip: string;
	badge: string;
	mod?: string;
};

type BadgeResult = Badge[] | Record<string, Badge[]>;

interface FetchBadgesOptions {
	nocache?: boolean;
	separated?: boolean;
}

type BadgeService = {
	service: string;
	url?:
		| string
		| ((userId: string) => string)
		| ((userId: string) => {
				user: string;
				badge: (id: string) => string;
		  });
	pluginsUrl?: string;
	rolesUrl?: string;
};

interface VencordEquicordData {
	[userId: string]: Array<{
		tooltip: string;
		badge: string;
	}>;
}

interface NekocordData {
	users: {
		[userId: string]: {
			badges: string[];
		};
	};
	badges: {
		[badgeId: string]: {
			name: string;
			image: string;
		};
	};
}

interface ReviewDbData {
	[userId: string]: ReviewDbBadgeItem[];
}

interface AeroData {
	[userId: string]: Array<{
		text: string;
		image: string;
		color: string;
	}>;
}

interface AliucordData {
	users: {
		[userId: string]: {
			roles?: string[];
			custom?: Array<{
				url: string;
				text: string;
			}>;
		};
	};
	guilds: {
		[guildId: string]: {
			url: string;
			text: string;
		};
	};
}

interface RaincordRolesData {
	[roleId: string]: {
		label: string;
		url: string;
	};
}

interface RaincordData {
	users: {
		[userId: string]: {
			roles: string[];
			custom: Array<{
				label: string;
				url: string;
			}>;
		};
	};
	roles: RaincordRolesData;
}

interface VelocityData {
	[userId: string]: {
		name: string;
		icon: object;
	};
}

type BadgeServiceData =
	| VencordEquicordData
	| NekocordData
	| ReviewDbData
	| AeroData
	| AliucordData
	| RaincordData
	| VelocityData
	| BadgeVaultData
	| EnmityData
	| PaicordData
	| GoosemodData
	| BunnyData
	| BetterDiscordData
	| VendroidEnhancedData
	| RevengeData
	| RecordData
	| RepluggedBadgeJsonData;

interface VencordBadgeItem {
	tooltip: string;
	badge: string;
}

interface NekocordBadgeInfo {
	name: string;
	image: string;
}

interface ReviewDbBadgeItem {
	name: string;
	icon: string;
	redirectURL?: string;
	type?: number;
	description?: string;
}

interface EnmityBadgeItem {
	name: string;
	badge: string;
}

interface EnmityData {
	[userId: string]: EnmityBadgeItem[];
}

interface PaicordData {
	[userId: string]: Badge[];
}

interface GoosemodData {
	[userId: string]: string[];
}

interface BunnyData {
	[userId: string]: {
		label: string;
		url: string;
	};
}

interface BetterDiscordData {
	[userId: string]: string[];
}

interface VendroidContributorsResponse {
	contributors: Array<{
		id: string;
		description: string;
	}>;
}

interface VendroidEnhancedData {
	[userId: string]: string[];
}

interface RevengeData {
	[userId: string]: string[];
}

interface RecordData {
	[userId: string]: string[];
}

interface RepluggedBadgeData {
	badges: {
		developer: boolean;
		staff: boolean;
		support: boolean;
		contributor: boolean;
		translator: boolean;
		hunter: boolean;
		early: boolean;
		booster: boolean;
		custom?: {
			name: string | null;
			icon: string | null;
			color: string | null;
		};
	};
}

interface RepluggedBadgeJsonData {
	[userId: string]: {
		cutiePerks?: {
			color: string;
			badge: string;
			title: string;
		};
		badges?: string[];
	};
}

interface BadgeVaultBadgeItem {
	name: string;
	badge: string;
	pending: boolean;
}

interface BadgeVaultData {
	[userId: string]: BadgeVaultBadgeItem[];
}

interface DiscordUserData {
	avatar: string;
	flags: number;
}

interface PluginData {
	hasPatches: boolean;
	hasCommands: boolean;
	enabledByDefault: boolean;
	required: boolean;
	tags: string[];
	name: string;
	description: string;
	authors: Array<{
		name: string;
		id: string;
	}>;
	filePath: string;
	commands?: Array<{
		name: string;
		description: string;
	}>;
	dependencies?: string[];
	target?: string;
}
