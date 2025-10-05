import { echo } from "@atums/echo";
import {
	badgeServices,
	botToken,
	discordBadgeDetails,
	discordBadges,
	redisTtl,
} from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import { redis } from "bun";

function getRequestOrigin(request: Request): string {
	const headers = request.headers;
	const forwardedProto = headers.get("X-Forwarded-Proto") || "http";
	const host = headers.get("Host") || new URL(request.url).host;
	return `${forwardedProto}://${host}`;
}

const USER_CACHE_SERVICES = ["discord", "enmity", "aero"];

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
		} catch {}

		return false;
	});

	const cacheHits = await Promise.all(userCachePromises);
	const servicesToFetch = services.filter((_, index) => !cacheHits[index]);

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
						const serviceData =
							await badgeCacheManager.getVencordEquicordData(serviceKey);
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
						const serviceData = await badgeCacheManager.getNekocordData();
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
						const serviceData = await badgeCacheManager.getReviewDbData();
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
						const serviceData = await badgeCacheManager.getAeroData();
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadges = serviceData[userId];
						if (Array.isArray(userBadges)) {
							const origin = request ? getRequestOrigin(request) : "";

							for (const badgeItem of userBadges) {
								let badgeType = "developer";
								const textLower = badgeItem.text.toLowerCase();

								if (textLower.includes("contributor")) {
									badgeType = "contributor";
								} else if (textLower.includes("tester")) {
									badgeType = "tester";
								} else if (textLower.includes("developer")) {
									badgeType = "developer";
								}

								result.push({
									tooltip: badgeItem.text,
									badge: `${origin}/public/badges/aero/${badgeType}.png`,
								});
							}
						}
						break;
					}

					case "aliucord": {
						const serviceData = await badgeCacheManager.getAliucordData();
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
						const serviceData = await badgeCacheManager.getRa1ncordData();
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
						const serviceData = await badgeCacheManager.getVelocityData();
						if (!serviceData) {
							echo.warn(`No cached data for service: ${serviceKey}`);
							break;
						}

						const userBadge = serviceData[userId];
						if (userBadge) {
							const origin = request ? getRequestOrigin(request) : "";
							const badgeName = userBadge.name.toLowerCase();
							let badgeType = "developer";

							if (badgeName.includes("contributor")) {
								badgeType = "contributor";
							} else if (badgeName.includes("translator")) {
								badgeType = "translator";
							} else if (badgeName.includes("early")) {
								badgeType = "early";
							} else if (badgeName.includes("developer")) {
								badgeType = "developer";
							}

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
						if (typeof entry.url !== "function") {
							break;
						}

						const url = entry.url(userId);
						if (typeof url !== "string") {
							break;
						}

						const res = await fetch(url);
						if (!res.ok) break;

						const data: BadgeVaultData = await res.json();

						if (
							data.customBadgesArray?.badges &&
							Array.isArray(data.customBadgesArray.badges)
						) {
							for (const badgeItem of data.customBadgesArray.badges) {
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
						if (typeof entry.url !== "function") {
							break;
						}

						const urlResult = entry.url(userId);

						if (
							typeof urlResult !== "object" ||
							typeof urlResult.user !== "string" ||
							typeof urlResult.badge !== "function"
						) {
							break;
						}

						const userRes = await fetch(urlResult.user);
						if (!userRes.ok) break;

						const badgeIds = await userRes.json();
						if (!Array.isArray(badgeIds)) break;

						const origin = request ? getRequestOrigin(request) : "";

						await Promise.all(
							badgeIds.map(async (id: string) => {
								try {
									const badgeRes = await fetch(urlResult.badge(id));
									if (!badgeRes.ok) return;

									const badge: EnmityBadgeItem = await badgeRes.json();
									if (!badge?.name) return;

									const badgeName = badge.name.toLowerCase();
									let badgeUrl = badge.url?.dark;

									if (badgeName.includes("dev")) {
										badgeUrl = `${origin}/public/badges/enmity/dev.png`;
									} else if (badgeName.includes("staff")) {
										badgeUrl = `${origin}/public/badges/enmity/staff.png`;
									} else if (badgeName.includes("support")) {
										badgeUrl = `${origin}/public/badges/enmity/supporter.png`;
									} else if (badgeName.includes("contributor")) {
										badgeUrl = `${origin}/public/badges/enmity/contributor.png`;
									}

									if (!badgeUrl) return;

									result.push({
										tooltip: badge.name,
										badge: badgeUrl,
									});
								} catch (error) {
									echo.warn({
										message: `Failed to fetch Enmity badge ${id}`,
										error:
											error instanceof Error ? error.message : String(error),
									});
								}
							}),
						);
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
					await redis.expire(userCacheKey, Math.min(redisTtl, 900));
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
