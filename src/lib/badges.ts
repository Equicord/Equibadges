import { echo } from "@atums/echo";
import {
	badgeServices,
	botToken,
	discordBadgeDetails,
	discordBadges,
	redisTtl,
	SECONDS_PER_HOUR,
} from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import {
	AERO_BADGE_KEYWORDS,
	determineBadgeType,
	ENMITY_BADGE_KEYWORDS,
	VELOCITY_BADGE_KEYWORDS,
} from "@lib/badgeUtils";
import { redis } from "bun";

function getRequestOrigin(request: Request): string {
	const headers = request.headers;
	const forwardedProto = headers.get("X-Forwarded-Proto") || "http";
	const host = headers.get("Host") || new URL(request.url).host;
	return `${forwardedProto}://${host}`;
}

const USER_CACHE_SERVICES = ["discord", "replugged"];

export async function fetchBadges(
	userId: string | undefined,
	services: string[],
	options?: FetchBadgesOptions,
	request?: Request,
): Promise<BadgeResult> {
	const { nocache = false, separated = false } = options ?? {};
	const results: Record<string, Badge[]> = {};

	if (!userId || !Array.isArray(services) || services.length === 0) {
		return separated ? results : [];
	}

	const userCachePromises = services.map(async (service) => {
		const serviceKey = service.toLowerCase();

		if (!USER_CACHE_SERVICES.includes(serviceKey) || nocache) {
			return false;
		}

		const userCacheKey = `user_badges:${serviceKey}:${userId}`;

		try {
			const cached = await redis.get(userCacheKey);
			if (cached) {
				const parsed: Badge[] = JSON.parse(cached);
				results[serviceKey] = parsed;
				return true;
			}
		} catch (error) {
			echo.warn({
				message: `Failed to get user badge cache for ${serviceKey}:${userId}`,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return false;
	});

	const cacheHits = await Promise.all(userCachePromises);
	const servicesToFetch = services.filter((_, index) => !cacheHits[index]);

	const serviceKeys = servicesToFetch.map((s) => s.toLowerCase());
	const serviceDataMap =
		await badgeCacheManager.getMultipleServiceData(serviceKeys);

	await Promise.all(
		servicesToFetch.map(async (service) => {
			const entry = badgeServices.find(
				(s) => s.service.toLowerCase() === service.toLowerCase(),
			);
			if (!entry) return;

			const serviceKey = service.toLowerCase();
			const result: Badge[] = [];

			try {
				switch (serviceKey) {
					case "vencord":
					case "equicord": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| VencordEquicordData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadges = serviceData[userId];
						if (Array.isArray(userBadges)) {
							const origin = request ? getRequestOrigin(request) : "";

							for (const badgeItem of userBadges) {
								const badgeUrl = badgeItem.badge.startsWith("/")
									? `${origin}${badgeItem.badge}`
									: badgeItem.badge;

								result.push({
									tooltip: badgeItem.tooltip,
									badge: badgeUrl,
								});
							}
						}
						break;
					}

					case "nekocord": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| NekocordData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadgeIds = serviceData.users?.[userId]?.badges;
						if (Array.isArray(userBadgeIds)) {
							for (const id of userBadgeIds) {
								const badgeInfo = serviceData.badges?.[id];
								if (badgeInfo) {
									result.push({
										tooltip: badgeInfo.name,
										badge: badgeInfo.image,
									});
								}
							}
						}
						break;
					}

					case "reviewdb": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| ReviewDbData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						for (const badgeItem of serviceData) {
							if (badgeItem.discordID === userId) {
								result.push({
									tooltip: badgeItem.name,
									badge: badgeItem.icon,
								});
							}
						}
						break;
					}

					case "aero": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| AeroData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadges = serviceData[userId];
						if (Array.isArray(userBadges)) {
							const origin = request ? getRequestOrigin(request) : "";

							for (const badgeItem of userBadges) {
								const badgeType = determineBadgeType(
									badgeItem.text,
									AERO_BADGE_KEYWORDS,
								);

								result.push({
									tooltip: badgeItem.text,
									badge: `${origin}/public/badges/aero/${badgeType}.png`,
								});
							}
						}
						break;
					}

					case "aliucord": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| AliucordData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userData = serviceData.users?.[userId];
						if (userData) {
							const origin = request ? getRequestOrigin(request) : "";

							if (Array.isArray(userData.roles)) {
								for (const role of userData.roles) {
									const roleLower = role.toLowerCase();
									if (
										roleLower === "donor" ||
										roleLower === "contributor" ||
										roleLower === "dev"
									) {
										result.push({
											tooltip: role,
											badge: `${origin}/public/badges/aliucord/${roleLower}.png`,
										});
									}
								}
							}

							if (Array.isArray(userData.custom)) {
								for (const customBadge of userData.custom) {
									result.push({
										tooltip: customBadge.text,
										badge: customBadge.url,
									});
								}
							}
						}
						break;
					}

					case "ra1ncord": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| Ra1ncordData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadges = serviceData[userId];
						if (Array.isArray(userBadges)) {
							for (const badgeItem of userBadges) {
								result.push({
									tooltip: badgeItem.label,
									badge: badgeItem.url,
								});
							}
						}
						break;
					}

					case "velocity": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| VelocityData
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadge = serviceData[userId];
						if (userBadge) {
							const origin = request ? getRequestOrigin(request) : "";
							const badgeType = determineBadgeType(
								userBadge.name,
								VELOCITY_BADGE_KEYWORDS,
							);

							result.push({
								tooltip: userBadge.name,
								badge: `${origin}/public/badges/velocity/${badgeType}.png`,
							});
						}
						break;
					}

					case "replugged": {
						if (typeof entry.url !== "function") {
							break;
						}

						const url = entry.url(userId);
						if (typeof url !== "string") {
							break;
						}

						const res = await fetch(url);
						if (!res.ok) break;

						const data: RepluggedBadgeData = await res.json();
						const origin = request ? getRequestOrigin(request) : "";

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

						for (const [key, label] of Object.entries(badgeMap)) {
							if (data.badges[key as keyof typeof data.badges] === true) {
								result.push({
									tooltip: label,
									badge: `${origin}/public/badges/replugged/${key}.png`,
								});
							}
						}

						if (data.badges.custom?.name && data.badges.custom?.icon) {
							result.push({
								tooltip: data.badges.custom.name,
								badge: data.badges.custom.icon,
							});
						}
						break;
					}

					case "badgevault": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| Record<string, BadgeVaultData>
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userData = serviceData[userId];
						if (
							userData &&
							!userData.blocked &&
							userData.badges &&
							Array.isArray(userData.badges)
						) {
							for (const badgeItem of userData.badges) {
								if (!badgeItem.pending) {
									result.push({
										tooltip: badgeItem.name,
										badge: badgeItem.badge,
									});
								}
							}
						}
						break;
					}

					case "enmity": {
						const serviceData = serviceDataMap.get(serviceKey) as
							| Record<
									string,
									{ badgeIds: string[]; badges: EnmityBadgeItem[] }
							  >
							| undefined;
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userData = serviceData[userId];
						if (userData?.badges) {
							const origin = request ? getRequestOrigin(request) : "";

							for (const badge of userData.badges) {
								if (!badge?.name) continue;

								const badgeType = determineBadgeType(
									badge.name,
									ENMITY_BADGE_KEYWORDS,
									"",
								);

								const badgeUrl = badgeType
									? `${origin}/public/badges/enmity/${badgeType}.png`
									: badge.url?.dark;

								if (!badgeUrl) continue;

								result.push({
									tooltip: badge.name,
									badge: badgeUrl,
								});
							}
						}
						break;
					}

					case "discord": {
						if (!botToken) {
							echo.warn("Discord bot token not configured");
							break;
						}

						if (typeof entry.url !== "function") {
							echo.warn("Discord service URL should be a function");
							break;
						}

						const url = entry.url(userId);
						if (typeof url !== "string") {
							echo.warn("Discord URL function should return a string");
							break;
						}

						const res = await fetch(url, {
							headers: {
								Authorization: `Bot ${botToken}`,
							},
						});

						if (!res.ok) {
							echo.warn(
								`Discord API request failed with status: ${res.status}`,
							);
							break;
						}

						const data: DiscordUserData = await res.json();
						const origin = request ? getRequestOrigin(request) : "";

						if (data.avatar?.startsWith("a_")) {
							result.push({
								tooltip: discordBadgeDetails.DISCORD_NITRO.tooltip,
								badge: `${origin}${discordBadgeDetails.DISCORD_NITRO.icon}`,
							});
						}

						if (typeof data.flags === "number") {
							for (const [flag, bitwise] of Object.entries(discordBadges)) {
								if (data.flags & bitwise) {
									const badge =
										discordBadgeDetails[
											flag as keyof typeof discordBadgeDetails
										];
									if (badge) {
										result.push({
											tooltip: badge.tooltip,
											badge: `${origin}${badge.icon}`,
										});
									}
								}
							}
						}
						break;
					}

					default:
						echo.warn(`Unknown service: ${serviceKey}`);
						break;
				}

				results[serviceKey] = result;

				if (
					USER_CACHE_SERVICES.includes(serviceKey) &&
					!nocache &&
					result.length > 0
				) {
					const userCacheKey = `user_badges:${serviceKey}:${userId}`;
					await redis.set(userCacheKey, JSON.stringify(result));
					await redis.expire(
						userCacheKey,
						Math.min(redisTtl, SECONDS_PER_HOUR),
					);
				}
			} catch (error) {
				echo.warn({
					message: `Failed to fetch badges for service ${serviceKey}`,
					error: error instanceof Error ? error.message : String(error),
					userId,
				});
			}
		}),
	);

	if (separated) return results;

	const combined: Badge[] = [];
	for (const group of Object.values(results)) {
		combined.push(...group);
	}
	return combined;
}
