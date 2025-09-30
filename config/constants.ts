const discordBadges = {
	// User badges
	STAFF: 1 << 0,
	PARTNER: 1 << 1,
	HYPESQUAD: 1 << 2,
	BUG_HUNTER_LEVEL_1: 1 << 3,
	HYPESQUAD_ONLINE_HOUSE_1: 1 << 6,
	HYPESQUAD_ONLINE_HOUSE_2: 1 << 7,
	HYPESQUAD_ONLINE_HOUSE_3: 1 << 8,
	PREMIUM_EARLY_SUPPORTER: 1 << 9,
	TEAM_USER: 1 << 10,
	SYSTEM: 1 << 12,
	BUG_HUNTER_LEVEL_2: 1 << 14,
	VERIFIED_DEVELOPER: 1 << 17,
	CERTIFIED_MODERATOR: 1 << 18,
	SPAMMER: 1 << 20,
	ACTIVE_DEVELOPER: 1 << 22,

	// Bot badges
	VERIFIED_BOT: 1 << 16,
	BOT_HTTP_INTERACTIONS: 1 << 19,
	SUPPORTS_COMMANDS: 1 << 23,
	USES_AUTOMOD: 1 << 24,
};

const discordBadgeDetails = {
	HYPESQUAD: {
		tooltip: "HypeSquad Events",
		icon: "/public/badges/discord/HYPESQUAD.svg",
	},
	HYPESQUAD_ONLINE_HOUSE_1: {
		tooltip: "HypeSquad Bravery",
		icon: "/public/badges/discord/HYPESQUAD_ONLINE_HOUSE_1.svg",
	},
	HYPESQUAD_ONLINE_HOUSE_2: {
		tooltip: "HypeSquad Brilliance",
		icon: "/public/badges/discord/HYPESQUAD_ONLINE_HOUSE_2.svg",
	},
	HYPESQUAD_ONLINE_HOUSE_3: {
		tooltip: "HypeSquad Balance",
		icon: "/public/badges/discord/HYPESQUAD_ONLINE_HOUSE_3.svg",
	},

	STAFF: {
		tooltip: "Discord Staff",
		icon: "/public/badges/discord/STAFF.svg",
	},
	PARTNER: {
		tooltip: "Discord Partner",
		icon: "/public/badges/discord/PARTNER.svg",
	},
	CERTIFIED_MODERATOR: {
		tooltip: "Certified Moderator",
		icon: "/public/badges/discord/CERTIFIED_MODERATOR.svg",
	},

	VERIFIED_DEVELOPER: {
		tooltip: "Verified Bot Developer",
		icon: "/public/badges/discord/VERIFIED_DEVELOPER.svg",
	},
	ACTIVE_DEVELOPER: {
		tooltip: "Active Developer",
		icon: "/public/badges/discord/ACTIVE_DEVELOPER.svg",
	},

	PREMIUM_EARLY_SUPPORTER: {
		tooltip: "Premium Early Supporter",
		icon: "/public/badges/discord/PREMIUM_EARLY_SUPPORTER.svg",
	},

	BUG_HUNTER_LEVEL_1: {
		tooltip: "Bug Hunter (Level 1)",
		icon: "/public/badges/discord/BUG_HUNTER_LEVEL_1.svg",
	},
	BUG_HUNTER_LEVEL_2: {
		tooltip: "Bug Hunter (Level 2)",
		icon: "/public/badges/discord/BUG_HUNTER_LEVEL_2.svg",
	},

	SUPPORTS_COMMANDS: {
		tooltip: "Supports Commands",
		icon: "/public/badges/discord/SUPPORTS_COMMANDS.svg",
	},
	USES_AUTOMOD: {
		tooltip: "Uses AutoMod",
		icon: "/public/badges/discord/USES_AUTOMOD.svg",
	},

	// Custom

	VENCORD_CONTRIBUTOR: {
		tooltip: "Vencord Contributor",
		icon: "/public/badges/vencord.png",
	},
	EQUICORD_CONTRIBUTOR: {
		tooltip: "Equicord Contributor",
		icon: "/public/badges/equicord.svg",
	},

	DISCORD_NITRO: {
		tooltip: "Discord Nitro",
		icon: "/public/badges/discord/NITRO.svg",
	},
};

const badgeServices: BadgeService[] = [
	{
		service: "Vencord",
		url: "https://badges.vencord.dev/badges.json",
		pluginsUrl:
			"https://raw.githubusercontent.com/Vencord/builds/main/plugins.json",
	},
	{
		service: "Equicord", // Ekwekord ! WOOP
		url: "https://raw.githubusercontent.com/Equicord/Equibored/refs/heads/main/badges.json",
		pluginsUrl:
			"https://raw.githubusercontent.com/Equicord/Equibored/refs/heads/main/plugins.json",
	},
	{
		service: "Nekocord",
		url: "https://nekocord.dev/assets/badges.json",
	},
	{
		service: "ReviewDb",
		url: "https://manti.vendicated.dev/api/reviewdb/badges",
	},
	{
		service: "Enmity",
		url: (userId: string) => ({
			user: `https://raw.githubusercontent.com/enmity-mod/badges/main/${userId}.json`,
			badge: (id: string) =>
				`https://raw.githubusercontent.com/enmity-mod/badges/main/data/${id}.json`,
		}),
	},
	{
		service: "Discord",
		url: (userId: string) => `https://discord.com/api/v10/users/${userId}`,
	},
	{
		service: "Aero",
		url: "https://gist.githubusercontent.com/TheCommieAxolotl/58c22cb5e91c71ce85818395dbe80c24/raw/badges.json",
	},
	{
		service: "Aliucord",
		url: "https://aliucord.com/files/badges/data.json",
	},
	{
		service: "Ra1ncord",
		url: "https://raw.githubusercontent.com/ra1ncord/badges/main/badges.json",
	},
	{
		service: "Replugged",
		url: (userId: string) => `https://replugged.dev/api/v1/users/${userId}`,
	},
];

function getServiceDescription(service: string): string {
	const descriptions: Record<string, string> = {
		Vencord: "Custom badges from Vencord Discord client",
		Equicord: "Custom badges from Equicord Discord client",
		Nekocord: "Custom badges from Nekocord Discord client",
		ReviewDb: "Badges from ReviewDB service",
		Enmity: "Custom badges from Enmity mobile Discord client",
		Discord: "Official Discord badges (staff, partner, hypesquad, etc.)",
		Aero: "Custom badges from Aero mod",
		Aliucord: "Custom badges from Aliucord mobile Discord client",
		Ra1ncord: "Custom badges from Ra1ncord Discord client",
		Replugged: "Custom badges from Replugged Discord client",
	};

	return descriptions[service] || "Custom badge service";
}

const gitUrl = "https://heliopolis.live/creations/badgeAPI";

export {
	badgeServices,
	discordBadges,
	discordBadgeDetails,
	getServiceDescription,
	gitUrl,
};
