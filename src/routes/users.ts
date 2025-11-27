import { badgeCacheManager } from "@lib/badgeCache";
import { getRequestOrigin } from "@lib/badges";
import {
	AERO_BADGE_KEYWORDS,
	determineBadgeType,
	ENMITY_BADGE_KEYWORDS,
	VELOCITY_BADGE_KEYWORDS,
} from "@lib/badgeUtils";
import { createErrorResponse } from "@lib/errorResponse";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const url = request ? getRequestOrigin(request) : "";

	try {
		const userServices = [
			"vencord",
			"equicord",
			"nekocord",
			"reviewdb",
			"aero",
			"aliucord",
			"ra1ncord",
			"velocity",
			"badgevault",
			"enmity",
		];

		const serviceDataMap =
			await badgeCacheManager.getMultipleServiceData(userServices);

		const allUsersMap = new Map<string, Badge[]>();

		for (const [serviceName, data] of serviceDataMap.entries()) {
			if (!data) continue;

			const serviceUsers: Record<string, Badge[]> = {};

			switch (serviceName) {
				case "vencord": {
					const vencordData = data as Record<string, Badge[]>;
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
					const vencordData = data as Record<string, Badge[]>;
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
					const nekocordData = data as {
						users?: Record<string, { badges: string[] }>;
						badges?: Record<string, { name: string; image: string }>;
					};
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
					const reviewdbData = data as Array<{
						discordID: string;
						name: string;
						icon: string;
					}>;
					if (Array.isArray(reviewdbData)) {
						const grouped = new Map<string, Badge[]>();
						for (const item of reviewdbData) {
							if (item.discordID) {
								if (!grouped.has(item.discordID)) {
									grouped.set(item.discordID, []);
								}
								grouped.get(item.discordID)?.push({
									tooltip: item.name,
									mod: "reviewdb",
									badge: item.icon,
								});
							}
						}
						for (const [userId, badges] of grouped.entries()) {
							serviceUsers[userId] = badges;
						}
					}
					break;
				}

				case "aero": {
					const aeroData = data as Record<
						string,
						Array<{ text: string; image: string; color: string }>
					>;
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
					const aliucordData = data as {
						users?: Record<
							string,
							{
								roles?: string[];
								custom?: Array<{ text: string; url: string }>;
							}
						>;
					};
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

				case "ra1ncord": {
					const ra1ncordData = data as Record<
						string,
						Array<{ label: string; url: string }>
					>;
					for (const [userId, badges] of Object.entries(ra1ncordData)) {
						serviceUsers[userId] = badges.map((b) => ({
							tooltip: b.label,
							mod: "ra1ncord",
							badge: b.url,
						}));
					}
					break;
				}

				case "velocity": {
					const velocityData = data as Record<string, { name: string }>;
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
					const badgevaultData = data as Record<
						string,
						{
							badges: Array<{ name: string; badge: string; pending: boolean }>;
							blocked: boolean;
						}
					>;
					for (const [userId, userData] of Object.entries(badgevaultData)) {
						if (!userData.blocked && Array.isArray(userData.badges)) {
							const badges: Badge[] = [];
							for (const badge of userData.badges) {
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
					const enmityData = data as Record<
						string,
						{ badges: Array<{ name: string; url?: { dark?: string } }> }
					>;
					for (const [userId, userData] of Object.entries(enmityData)) {
						if (Array.isArray(userData.badges)) {
							const badges: Badge[] = [];
							for (const badge of userData.badges) {
								if (badge.name) {
									const badgeType = determineBadgeType(
										badge.name,
										ENMITY_BADGE_KEYWORDS,
										"",
									);
									const badgeUrl = badgeType
										? `${url}/public/badges/enmity/${badgeType}.png`
										: badge.url?.dark;
									if (!badgeUrl) continue;

									badges.push({
										tooltip: badge.name,
										mod: "enmity",
										badge: badgeUrl,
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
