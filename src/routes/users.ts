import { badgeCacheManager } from "@lib/badgeCache";
import { createErrorResponse } from "@lib/errorResponse";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const { separated } = request.query;
	const groupByService = separated === "true";

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
		const usersByService: Record<string, Record<string, Badge[]>> = {};

		for (const [serviceName, data] of serviceDataMap.entries()) {
			if (!data) continue;

			const serviceUsers: Record<string, Badge[]> = {};

			switch (serviceName) {
				case "vencord":
				case "equicord": {
					const vencordData = data as Record<string, Badge[]>;
					for (const [userId, badges] of Object.entries(vencordData)) {
						serviceUsers[userId] = badges;
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
					const aeroData = data as Record<string, Badge[]>;
					for (const [userId, badges] of Object.entries(aeroData)) {
						serviceUsers[userId] = badges;
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
									badges.push({ tooltip: role, badge: role });
								}
							}
							if (Array.isArray(userData.custom)) {
								for (const custom of userData.custom) {
									badges.push({ tooltip: custom.text, badge: custom.url });
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
					const ra1ncordData = data as Record<string, Badge[]>;
					for (const [userId, badges] of Object.entries(ra1ncordData)) {
						serviceUsers[userId] = badges;
					}
					break;
				}

				case "velocity": {
					const velocityData = data as Record<string, { name: string }>;
					for (const [userId, userData] of Object.entries(velocityData)) {
						serviceUsers[userId] = [
							{ tooltip: userData.name, badge: userData.name },
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
									badges.push({ tooltip: badge.name, badge: badge.badge });
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
								if (badge.name && badge.url?.dark) {
									badges.push({ tooltip: badge.name, badge: badge.url.dark });
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
				usersByService[serviceName] = serviceUsers;

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

		if (groupByService) {
			return Response.json(
				{
					status: 200,
					totalUsers: allUsersMap.size,
					users: usersByService,
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
		}

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
