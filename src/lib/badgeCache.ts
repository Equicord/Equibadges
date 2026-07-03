import { echo } from "@atums/echo";
import {
	badgeFetchInterval,
	badgeServices,
	cacheConfig,
	discordBadgeDetails,
	gitUrl,
	redisTtl,
} from "@config";
import { redis } from "bun";

const BADGE_API_HEADERS = {
	"User-Agent": `BadgeAPI ${gitUrl}`,
};

const PER_USER_SERVICES = ["discord", "replugged"];

function getStaticServices(): string[] {
	return badgeServices
		.map((s) => s.service.toLowerCase())
		.filter((s) => !PER_USER_SERVICES.includes(s));
}

async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeout: number = cacheConfig.httpFetchTimeout,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	maxRetries: number = cacheConfig.httpFetchRetries,
): Promise<Response> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetchWithTimeout(url, options);
			if (response.ok) {
				return response;
			}
			if (response.status >= 400 && response.status < 500) {
				return response;
			}
			lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
		}

		if (attempt < maxRetries) {
			const backoffMs = 2 ** attempt * 1000;
			echo.debug(
				`Fetch failed for ${url}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`,
			);
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
		}
	}

	throw lastError || new Error("Fetch failed after all retries");
}

class BadgeCacheManager {
	private updateInterval: Timer | null = null;
	private readonly CACHE_PREFIX = `badge_service_data:${cacheConfig.version}:`;
	private readonly CACHE_TIMESTAMP_PREFIX =
		`badge_cache_timestamp:${cacheConfig.version}:`;
	private metrics = {
		hits: 0,
		misses: 0,
		errors: 0,
	};

	async initialize(): Promise<void> {
		echo.info("Initializing badge cache manager...");

		try {
			echo.info("Testing Redis connection...");
			const pingPromise = redis.ping();
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(
								`Redis connection timeout after ${cacheConfig.redisTimeout}ms`,
							),
						),
					cacheConfig.redisTimeout,
				),
			);
			await Promise.race([pingPromise, timeoutPromise]);
			echo.info("Redis connection established successfully");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			echo.error({
				message: "Failed to connect to Redis - cannot start application",
				error: errorMessage,
			});
			await new Promise((resolve) => setTimeout(resolve, 100));
			throw new Error(`Redis connection failed: ${errorMessage}`);
		}

		if (cacheConfig.preloadOnStartup) {
			echo.info("Preloading all service data on startup...");
			await this.updateAllServiceData();
		} else {
			const needsUpdate = await this.checkIfUpdateNeeded();
			if (needsUpdate) {
				await this.updateAllServiceData();
			} else {
				echo.debug("Badge cache is still valid, skipping initial update");
			}
		}

		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}

		this.updateInterval = setInterval(
			() => this.updateAllServiceData(),
			badgeFetchInterval,
		);

		echo.debug("Badge cache manager initialized with 1-hour update interval");
	}

	async shutdown(): Promise<void> {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
		}

		try {
			redis.close();
			echo.debug("Redis connection closed");
		} catch (error) {
			echo.warn({
				message: "Failed to close Redis connection",
				error: error instanceof Error ? error.message : String(error),
			});
		}

		echo.debug("Badge cache manager shut down");
	}

	getMetrics() {
		return { ...this.metrics };
	}

	resetMetrics() {
		this.metrics = { hits: 0, misses: 0, errors: 0 };
	}

	private async checkIfUpdateNeeded(): Promise<boolean> {
		try {
			const staticServices = getStaticServices();
			const now = Date.now();

			for (const serviceName of staticServices) {
				const timestampKey = `${this.CACHE_TIMESTAMP_PREFIX}${serviceName}`;
				const cacheKey = `${this.CACHE_PREFIX}${serviceName}`;

				const [timestamp, data] = await Promise.all([
					redis.get(timestampKey),
					redis.get(cacheKey),
				]);

				if (!data || !timestamp) {
					echo.debug(`Cache missing for service: ${serviceName}`);
					return true;
				}

				const lastUpdate = Number.parseInt(timestamp, 10);
				if (now - lastUpdate > badgeFetchInterval) {
					echo.debug(`Cache expired for service: ${serviceName}`);
					return true;
				}
			}

			echo.debug("All service caches are valid");
			return false;
		} catch (error) {
			echo.warn({
				message: "Failed to check cache validity, forcing update",
				error: error instanceof Error ? error.message : String(error),
			});
			return true;
		}
	}

	private async updateAllServiceData(): Promise<void> {
		echo.debug("Updating badge service data...");

		const updatePromises = badgeServices.map(async (service: BadgeService) => {
			try {
				await this.updateServiceData(service);
			} catch (error) {
				echo.error({
					message: `Failed to update service data for ${service.service}`,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});

		await Promise.allSettled(updatePromises);
		echo.debug("Badge service data update completed");
	}

	private async updateServiceData(service: BadgeService): Promise<void> {
		const serviceKey = service.service.toLowerCase();
		const cacheKey = `${this.CACHE_PREFIX}${serviceKey}`;
		const timestampKey = `${this.CACHE_TIMESTAMP_PREFIX}${serviceKey}`;

		try {
			let data: BadgeServiceData | null = null;

			switch (serviceKey) {
				case "vencord":
				case "equicord":
				case "paicord": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as VencordEquicordData;
						}
					}

					if (typeof service.pluginsUrl === "string") {
						const contributorRes = await fetchWithRetry(service.pluginsUrl, {
							headers: BADGE_API_HEADERS,
						});

						if (contributorRes.ok) {
							const pluginData = await contributorRes.json();

							if (Array.isArray(pluginData)) {
								if (!data) {
									data = {} as VencordEquicordData;
								}

								const contributors = new Set<string>();

								for (const plugin of pluginData) {
									if (plugin.authors && Array.isArray(plugin.authors)) {
										for (const author of plugin.authors) {
											if (author.id) {
												contributors.add(author.id);
											}
										}
									}
								}

								const badgeDetails =
									serviceKey === "vencord"
										? {
											tooltip:
												discordBadgeDetails.VENCORD_CONTRIBUTOR.tooltip,
											badge: discordBadgeDetails.VENCORD_CONTRIBUTOR.icon,
										}
										: {
											tooltip:
												discordBadgeDetails.EQUICORD_CONTRIBUTOR.tooltip,
											badge: discordBadgeDetails.EQUICORD_CONTRIBUTOR.icon,
										};

								for (const authorId of contributors) {
									if (!data[authorId]) {
										data[authorId] = [];
									}

									const hasContributorBadge = data[authorId].some(
										(badge) => badge.tooltip === badgeDetails.tooltip,
									);

									if (!hasContributorBadge) {
										data[authorId].push(badgeDetails);
									}
								}
							}
						}
					}
					break;
				}

				case "nekocord": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as NekocordData;
						}
					}
					break;
				}

				case "reviewdb": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as ReviewDbData;
						}
					}
					break;
				}

				case "aero": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as AeroData;
						}
					}
					break;
				}

				case "aliucord": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as AliucordData;
						}
					}
					break;
				}

				case "raincord": {
					if (typeof service.url === "string") {
						const fetches: [Promise<Response>, Promise<Response> | null] = [
							fetchWithRetry(service.url, { headers: BADGE_API_HEADERS }),
							typeof service.rolesUrl === "string"
								? fetchWithRetry(service.rolesUrl, {
									headers: BADGE_API_HEADERS,
								})
								: null,
						];

						const [usersRes, rolesRes] = await Promise.all(
							fetches.map((f) => f ?? Promise.resolve(null)),
						);

						if (usersRes?.ok) {
							const users = await usersRes.json();
							let roles: RaincordRolesData = {};

							if (rolesRes?.ok) {
								roles = await rolesRes.json();
							}

							data = { users, roles } as RaincordData;
						}
					}
					break;
				}

				case "velocity": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as VelocityData;
						}
					}
					break;
				}

				case "badgevault": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as BadgeVaultData;
						}
					}
					break;
				}

				case "enmity": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as EnmityData;
						}
					}
					break;
				}

				case "discord":
				case "replugged":
					return;

				case "goosemod": {
					const file = Bun.file("public/badges/goosemod/badges.json");
					if (await file.exists()) {
						data = (await file.json()) as GoosemodData;
					}
					break;
				}

				case "bunny": {
					const file = Bun.file("public/badges/bunny/badges.json");
					if (await file.exists()) {
						data = (await file.json()) as BunnyData;
					}
					break;
				}

				case "betterdiscord": {
					const file = Bun.file("public/badges/betterdiscord/badges.json");
					if (await file.exists()) {
						data = (await file.json()) as BetterDiscordData;
					}
					break;
				}

				default:
					echo.warn(`Unknown service type: ${serviceKey}`);
					return;
			}

			if (data) {
				const now = Date.now();
				await Promise.all([
					redis.send("SETEX", [
						cacheKey,
						redisTtl.toString(),
						JSON.stringify(data),
					]),
					redis.send("SETEX", [
						timestampKey,
						redisTtl.toString(),
						now.toString(),
					]),
				]);

				echo.debug(`Updated cache for service: ${service.service}`);
			}
		} catch (error) {
			echo.warn({
				message: `Failed to fetch data for service: ${service.service}`,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async getServiceData(serviceKey: string): Promise<BadgeServiceData | null> {
		const cacheKey = `${this.CACHE_PREFIX}${serviceKey}`;

		try {
			const cached = await redis.get(cacheKey);
			if (cached) {
				this.metrics.hits++;
				return JSON.parse(cached) as BadgeServiceData;
			}
			this.metrics.misses++;
		} catch (error) {
			this.metrics.errors++;
			echo.warn({
				message: `Failed to get cached data for service: ${serviceKey}`,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return null;
	}

	async getMultipleServiceData(
		serviceKeys: string[],
	): Promise<Map<string, BadgeServiceData>> {
		const result = new Map<string, BadgeServiceData>();

		if (serviceKeys.length === 0) {
			return result;
		}

		try {
			const cacheKeys = serviceKeys.map((key) => `${this.CACHE_PREFIX}${key}`);
			const cachedValues = await redis.mget(...cacheKeys);

			for (let i = 0; i < serviceKeys.length; i++) {
				const cached = cachedValues[i];
				const serviceKey = serviceKeys[i];
				if (cached && typeof cached === "string" && serviceKey) {
					try {
						result.set(serviceKey, JSON.parse(cached) as BadgeServiceData);
					} catch (parseError) {
						echo.warn({
							message: `Failed to parse cached data for service: ${serviceKey}`,
							error:
								parseError instanceof Error
									? parseError.message
									: String(parseError),
						});
					}
				}
			}
		} catch (error) {
			echo.warn({
				message: "Failed to get multiple cached services",
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return result;
	}

	async forceUpdateService(serviceName: string): Promise<void> {
		const service = badgeServices.find(
			(s: BadgeService) =>
				s.service.toLowerCase() === serviceName.toLowerCase(),
		);

		if (service) {
			await this.updateServiceData(service);
			echo.info(`Force updated service: ${serviceName}`);
		} else {
			throw new Error(`Service not found: ${serviceName}`);
		}
	}

	async clearCache(serviceName?: string): Promise<number> {
		if (serviceName) {
			const cacheKey = `${this.CACHE_PREFIX}${serviceName}`;
			const timestampKey = `${this.CACHE_TIMESTAMP_PREFIX}${serviceName}`;
			await Promise.all([redis.del(cacheKey), redis.del(timestampKey)]);
			echo.info(`Cleared cache for service: ${serviceName}`);
			return 2;
		}

		const services = getStaticServices();

		let deleteCount = 0;
		for (const service of services) {
			const cacheKey = `${this.CACHE_PREFIX}${service}`;
			const timestampKey = `${this.CACHE_TIMESTAMP_PREFIX}${service}`;
			await Promise.all([redis.del(cacheKey), redis.del(timestampKey)]);
			deleteCount += 2;
		}

		echo.info(`Cleared cache for all services (${deleteCount} keys)`);
		return deleteCount;
	}
}

export const badgeCacheManager = new BadgeCacheManager();
