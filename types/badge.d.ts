type Badge = {
	tooltip: string;
	badge: string;
};

type BadgeResult = Badge[] | Record<string, Badge[]>;

interface FetchBadgesOptions {
	nocache?: boolean;
	separated?: boolean;
}

type BadgeService = {
	service: string;
	url:
		| string
		| ((userId: string) => string)
		| ((userId: string) => {
				user: string;
				badge: (id: string) => string;
		  });
	pluginsUrl?: string;
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

interface ReviewDbData
	extends Array<{
		discordID: string;
		name: string;
		icon: string;
	}> {}

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

interface Ra1ncordData {
	[userId: string]: Array<{
		label: string;
		url: string;
	}>;
}

interface VelocityData {
	[userId: string]: {
		name: string;
		icon: object;
	};
}

type BadgeServiceData = VencordEquicordData | NekocordData | ReviewDbData | AeroData | AliucordData | Ra1ncordData | VelocityData;

interface VencordBadgeItem {
	tooltip: string;
	badge: string;
}

interface NekocordBadgeInfo {
	name: string;
	image: string;
}

interface ReviewDbBadgeItem {
	discordID: string;
	name: string;
	icon: string;
}

interface EnmityBadgeItem {
	name: string;
	url: {
		dark: string;
	};
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
			name: string;
			icon: string;
			color: string;
		};
	};
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
