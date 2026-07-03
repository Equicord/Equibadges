import { badgeServices } from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import { getRequestOrigin } from "@lib/badges";
import {
	AERO_BADGE_KEYWORDS,
	determineBadgeType,
	VELOCITY_BADGE_KEYWORDS,
} from "@lib/badgeUtils";
import { createErrorResponse } from "@lib/errorResponse";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

const PER_USER_SERVICES = ["discord", "replugged"];

function getStaticServices(): string[] {
	return badgeServices
		.map((s) => s.service.toLowerCase())
		.filter((s) => !PER_USER_SERVICES.includes(s));
}

async function handler(request: ExtendedRequest): Promise<Response> {
	const url = request ? getRequestOrigin(request) : "";

	try {
		const userServices = getStaticServices();

		const serviceDataMap =
			await badgeCacheManager.getMultipleServiceData(userServices);

		const allUsersMap = new Map<string, Badge[]>();

		for (const [serviceName, data] of serviceDataMap.entries()) {
			if (!data) continue;

			const serviceUsers: Record<string, Badge[]> = {};

			switch (serviceName) {
				case "vencord": {
					const vencordData = data as VencordEquicordData;
					for (const [userId, badges] of Object.entries(vencordData)) {
						serviceUsers[userId] = badges.map((b) => {
							const badgeUrl = b.badge.startsWith("/")
								? `${url}${b.badge}`
								: b.badge;
							return {
								tooltip: b.tooltip,
								mod: "vencord",
								badge: badgeUrl,
							};
						});
					}
					break;
				}

				case "equicord": {
					const vencordData = data as VencordEquicordData;
					for (const [userId, badges] of Object.entries(vencordData)) {
						serviceUsers[userId] = badges.map((b) => {
							const badgeUrl = b.badge.startsWith("/")
								? `${url}${b.badge}`
								: b.badge;
							return {
								tooltip: b.tooltip,
								mod: "equicord",
								badge: badgeUrl,
							};
						});
					}
					break;
				}

				case "nekocord": {
					const nekocordData = data as NekocordData;
					if (nekocordData.users && nekocordData.badges) {
						for (const [userId, userData] of Object.entries(
							nekocordData.users,
						)) {
							const badges: Badge[] = [];
							if (Array.isArray(userData.badges)) {
								for (const badgeId of userData.badges) {
									const badgeInfo = nekocordData.badges[badgeId];
									if (badgeInfo) {
										badges.push({
											tooltip: badgeInfo.name,
											mod: "nekocord",
											badge: badgeInfo.image,
										});
									}
								}
							}
							if (badges.length > 0) {
								serviceUsers[userId] = badges;
							}
						}
					}
					break;
				}

				case "reviewdb": {
					const reviewdbData = data as ReviewDbData;
					for (const [userId, items] of Object.entries(reviewdbData)) {
						if (Array.isArray(items) && items.length > 0) {
							serviceUsers[userId] = items.map((item) => ({
								tooltip: item.name,
								mod: "reviewdb",
								badge: item.icon,
							}));
						}
					}
					break;
				}

				case "aero": {
					const aeroData = data as AeroData;
					for (const [userId, badges] of Object.entries(aeroData)) {
						serviceUsers[userId] = badges.map((b) => {
							const badgeType = determineBadgeType(b.text, AERO_BADGE_KEYWORDS);
							return {
								tooltip: b.text,
								mod: "aero",
								badge: `${url}/public/badges/aero/${badgeType}.png`,
							};
						});
					}
					break;
				}

				case "aliucord": {
					const aliucordData = data as AliucordData;
					if (aliucordData.users) {
						for (const [userId, userData] of Object.entries(
							aliucordData.users,
						)) {
							const badges: Badge[] = [];
							if (Array.isArray(userData.roles)) {
								for (const role of userData.roles) {
									const roleLower = role.toLowerCase();
									if (
										roleLower === "donor" ||
										roleLower === "contributor" ||
										roleLower === "dev"
									) {
										badges.push({
											tooltip: role,
											mod: "aliucord",
											badge: `${url}/public/badges/aliucord/${roleLower}.png`,
										});
									}
								}
							}
							if (Array.isArray(userData.custom)) {
								for (const custom of userData.custom) {
									badges.push({
										tooltip: custom.text,
										mod: "aliucord",
										badge: custom.url,
									});
								}
							}
							if (badges.length > 0) {
								serviceUsers[userId] = badges;
							}
						}
					}
					break;
				}

				case "raincord": {
					const raincordData = data as RaincordData;
					if (raincordData.users) {
						for (const [userId, userEntry] of Object.entries(
							raincordData.users,
						)) {
							const badges: Array<{
								tooltip: string;
								mod: string;
								badge: string;
							}> = [];

							if (Array.isArray(userEntry.roles)) {
								for (const role of userEntry.roles) {
									const roleInfo = raincordData.roles?.[role];
									if (roleInfo) {
										badges.push({
											tooltip: roleInfo.label,
											mod: "raincord",
											badge: roleInfo.url,
										});
									}
								}
							}

							if (Array.isArray(userEntry.custom)) {
								for (const b of userEntry.custom) {
									badges.push({
										tooltip: b.label,
										mod: "raincord",
										badge: b.url,
									});
								}
							}

							if (badges.length > 0) {
								serviceUsers[userId] = badges;
							}
						}
					}
					break;
				}

				case "velocity": {
					const velocityData = data as VelocityData;
					for (const [userId, userData] of Object.entries(velocityData)) {
						const badgeType = determineBadgeType(
							userData.name,
							VELOCITY_BADGE_KEYWORDS,
						);
						serviceUsers[userId] = [
							{
								tooltip: userData.name,
								mod: "velocity",
								badge: `${url}/public/badges/velocity/${badgeType}.png`,
							},
						];
					}
					break;
				}

				case "badgevault": {
					const badgevaultData = data as BadgeVaultData;
					for (const [userId, userBadges] of Object.entries(badgevaultData)) {
						if (Array.isArray(userBadges)) {
							const badges: Badge[] = [];
							for (const badge of userBadges) {
								if (!badge.pending) {
									badges.push({
										tooltip: badge.name,
										mod: "badgevault",
										badge: badge.badge,
									});
								}
							}
							if (badges.length > 0) {
								serviceUsers[userId] = badges;
							}
						}
					}
					break;
				}

				case "enmity": {
					const enmityData = data as EnmityData;
					for (const [userId, userBadges] of Object.entries(enmityData)) {
						if (Array.isArray(userBadges) && userBadges.length > 0) {
							serviceUsers[userId] = userBadges.map((b) => ({
								tooltip: b.name,
								mod: "enmity",
								badge: b.badge,
							}));
						}
					}
					break;
				}

				case "paicord": {
					const paicordData = data as PaicordData;
					for (const [userId, badges] of Object.entries(paicordData)) {
						serviceUsers[userId] = badges.map((b) => ({
							tooltip: b.tooltip,
							mod: "paicord",
							badge: b.badge,
						}));
					}
					break;
				}

				case "goosemod": {
					const goosemodData = data as GoosemodData;
					const badgeMap: Record<string, string> = {
						sponsor: "Sponsor",
						dev: "Developer",
						translator: "Translator",
					};
					for (const [userId, userBadges] of Object.entries(goosemodData)) {
						if (Array.isArray(userBadges)) {
							for (const badgeKey of userBadges) {
								if (badgeMap[badgeKey]) {
									if (!serviceUsers[userId]) serviceUsers[userId] = [];
									serviceUsers[userId].push({
										tooltip: badgeMap[badgeKey],
										mod: "goosemod",
										badge: `${url}/public/badges/goosemod/${badgeKey}.png`,
									});
								}
							}
						}
					}
					break;
				}

				case "bunny": {
					const bunnyData = data as BunnyData;
					for (const [userId, userData] of Object.entries(bunnyData)) {
						const badgeUrl = userData.url.startsWith("/")
							? `${url}${userData.url}`
							: userData.url;
						serviceUsers[userId] = [
							{
								tooltip: userData.label,
								mod: "bunny",
								badge: badgeUrl,
							},
						];
					}
					break;
				}

				case "betterdiscord": {
					const bdData = data as BetterDiscordData;
					const badgeMap: Record<string, string> = {
						developer: "Developer",
					};
					for (const [userId, userBadges] of Object.entries(bdData)) {
						if (Array.isArray(userBadges)) {
							for (const badgeKey of userBadges) {
								if (badgeMap[badgeKey]) {
									if (!serviceUsers[userId]) serviceUsers[userId] = [];
									serviceUsers[userId].push({
										tooltip: badgeMap[badgeKey],
										mod: "betterdiscord",
										badge: `${url}/public/badges/betterdiscord/${badgeKey}.png`,
									});
								}
							}
						}
					}
					break;
				}
			}

			if (Object.keys(serviceUsers).length > 0) {
				for (const [userId, badges] of Object.entries(serviceUsers)) {
					if (!allUsersMap.has(userId)) {
						allUsersMap.set(userId, []);
					}
					allUsersMap.get(userId)?.push(...badges);
				}
			}
		}

		try {
			const repluggedFile = Bun.file("public/badges/replugged/badges.json");
			if (await repluggedFile.exists()) {
				const repluggedData =
					(await repluggedFile.json()) as RepluggedBadgeJsonData;
				for (const [userId, userData] of Object.entries(repluggedData)) {
					if (Array.isArray(userData.badges)) {
						const badges: Badge[] = [];
						const badgeMap: Record<string, string> = {
							developer: "Developer",
							staff: "Staff",
							support: "Support",
							contributor: "Contributor",
							translator: "Translator",
							hunter: "Hunter",
							early: "Early User",
							booster: "Booster",
						};

						for (const key of userData.badges) {
							if (badgeMap[key]) {
								badges.push({
									tooltip: badgeMap[key],
									mod: "replugged",
									badge: `${url}/public/badges/replugged/${key}.png`,
								});
							}
						}

						if (userData.cutiePerks?.badge && userData.cutiePerks?.title) {
							badges.push({
								tooltip: userData.cutiePerks.title,
								mod: "replugged",
								badge: userData.cutiePerks.badge,
							});
						}

						if (badges.length > 0) {
							if (!allUsersMap.has(userId)) {
								allUsersMap.set(userId, []);
							}
							allUsersMap.get(userId)?.push(...badges);
						}
					}
				}
			}
		} catch (error) {
			return createErrorResponse(
				500,
				"Failed to load replugged badges",
				error instanceof Error ? error.message : String(error),
			);
		}

		const allUsers: Record<string, Badge[]> = {};
		const sortedUserIds = Array.from(allUsersMap.keys()).sort();
		for (const userId of sortedUserIds) {
			allUsers[userId] = allUsersMap.get(userId) || [];
		}

		const origin = request.headers.get("Origin") || "*";

		return Response.json(
			{
				status: 200,
				totalUsers: allUsersMap.size,
				users: allUsers,
			},
			{
				status: 200,
				headers: {
					"Cache-Control": "public, max-age=60",
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": origin,
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
					"Access-Control-Allow-Credentials": "true",
				},
			},
		);
	} catch (error) {
		return createErrorResponse(
			500,
			"Failed to aggregate users",
			error instanceof Error ? error.message : String(error),
		);
	}
}

export { handler, routeDef };
