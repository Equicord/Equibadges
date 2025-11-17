import path from "node:path";
import { echo } from "@atums/echo";
import {
	badgeFetchInterval,
	badgeServices,
	cacheConfig,
	cachePaths,
	discordBadgeDetails,
	githubToken,
	gitUrl,
	redisTtl,
} from "@config";
import { syncGitRepository } from "@lib/gitSync";
import { redis } from "bun";

const BADGE_API_HEADERS = {
	"User-Agent": `BadgeAPI ${gitUrl}`,
};

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
	private readonly GIT_LOCK_PREFIX = "git_lock:";
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
		echo.debug("Badge cache manager shut down");
	}

	private async acquireGitLock(service: string): Promise<boolean> {
		const lockKey = `${this.GIT_LOCK_PREFIX}${service}`;
		const lockValue = Date.now().toString();
		const lockTTL = 300;

		try {
			const result = await redis.send("SET", [
				lockKey,
				lockValue,
				"EX",
				lockTTL.toString(),
				"NX",
			]);
			return result === "OK";
		} catch (error) {
			echo.error({
				message: `Failed to acquire git lock for ${service}`,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	private async releaseGitLock(service: string): Promise<void> {
		const lockKey = `${this.GIT_LOCK_PREFIX}${service}`;
		try {
			await redis.del(lockKey);
		} catch (error) {
			echo.error({
				message: `Failed to release git lock for ${service}`,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	getMetrics() {
		return { ...this.metrics };
	}

	resetMetrics() {
		this.metrics = { hits: 0, misses: 0, errors: 0 };
	}

	private async checkIfUpdateNeeded(): Promise<boolean> {
		try {
			const staticServices = [
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

				if (serviceName === "badgevault" || serviceName === "enmity") {
					const gitConfigPath =
						serviceName === "badgevault"
							? path.join(cachePaths.badgevault, ".git/config")
							: path.join(cachePaths.enmity, ".git/config");

					const dirExists = await Bun.file(gitConfigPath).exists();
					if (!dirExists) {
						echo.debug(
							`Cache directory missing for service: ${serviceName}, forcing update`,
						);
						return true;
					}
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
				case "equicord": {
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

				case "ra1ncord": {
					if (typeof service.url === "string") {
						const res = await fetchWithRetry(service.url, {
							headers: BADGE_API_HEADERS,
						});

						if (res.ok) {
							data = (await res.json()) as Ra1ncordData;
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
					const cacheDir = cachePaths.badgevault;
					const userDir = path.join(cacheDir, "User");

					const lockAcquired = await this.acquireGitLock("badgevault");
					if (!lockAcquired) {
						echo.warn(
							"BadgeVault: Git operation already in progress, skipping",
						);
						return;
					}

					try {
						await syncGitRepository(
							cacheDir,
							"https://github.com/WolfPlugs/BadgeVault.git",
							"BadgeVault",
							githubToken,
						);

						echo.debug("BadgeVault: Reading user badge files...");
						const userFiles = await Array.fromAsync(
							new Bun.Glob("*.json").scan({
								cwd: userDir,
							}),
						);

						echo.debug(`BadgeVault: Found ${userFiles.length} user files`);

						const badgeVaultData: Record<string, BadgeVaultData> = {};

						for (const file of userFiles) {
							const userId = file.replace(".json", "");
							const filePath = path.join(userDir, file);
							const fileContent = await Bun.file(filePath).text();
							const userData: BadgeVaultData = JSON.parse(fileContent);
							badgeVaultData[userId] = userData;
						}

						echo.debug(
							`BadgeVault: Consolidated ${Object.keys(badgeVaultData).length} users into cache`,
						);
						data = badgeVaultData;
					} catch (error) {
						echo.error({
							message: "Failed to sync BadgeVault repository",
							error: error instanceof Error ? error.message : String(error),
						});
					} finally {
						await this.releaseGitLock("badgevault");
					}
					break;
				}

				case "enmity": {
					const cacheDir = cachePaths.enmity;
					const dataDir = path.join(cacheDir, "data");

					const lockAcquired = await this.acquireGitLock("enmity");
					if (!lockAcquired) {
						echo.warn("Enmity: Git operation already in progress, skipping");
						return;
					}

					try {
						await syncGitRepository(
							cacheDir,
							"https://github.com/enmity-mod/badges.git",
							"Enmity",
							githubToken,
						);

						echo.debug("Enmity: Reading user badge files...");
						const userFiles = await Array.fromAsync(
							new Bun.Glob("*.json").scan({
								cwd: cacheDir,
								onlyFiles: true,
							}),
						);

						const badgeFiles = await Array.fromAsync(
							new Bun.Glob("*.json").scan({
								cwd: dataDir,
							}),
						);

						echo.debug(
							`Enmity: Found ${userFiles.length} user files and ${badgeFiles.length} badge definitions`,
						);

						const badgeDefinitions: Record<string, EnmityBadgeItem> = {};
						for (const file of badgeFiles) {
							const filePath = path.join(dataDir, file);
							const fileContent = await Bun.file(filePath).text();
							const badge: EnmityBadgeItem = JSON.parse(fileContent);
							badgeDefinitions[badge.id] = badge;
						}

						const enmityData: Record<
							string,
							{ badgeIds: string[]; badges: EnmityBadgeItem[] }
						> = {};

						for (const file of userFiles) {
							const userId = file.replace(".json", "");
							const filePath = path.join(cacheDir, file);
							const fileContent = await Bun.file(filePath).text();
							const badgeIds: string[] = JSON.parse(fileContent);

							const badges: EnmityBadgeItem[] = [];
							for (const badgeId of badgeIds) {
								if (badgeDefinitions[badgeId]) {
									badges.push(badgeDefinitions[badgeId]);
								}
							}

							enmityData[userId] = { badgeIds, badges };
						}

						echo.debug(
							`Enmity: Consolidated ${Object.keys(enmityData).length} users into cache`,
						);
						data = enmityData;
					} catch (error) {
						echo.error({
							message: "Failed to sync Enmity repository",
							error: error instanceof Error ? error.message : String(error),
						});
					} finally {
						await this.releaseGitLock("enmity");
					}
					break;
				}

				case "discord":
				case "replugged":
					return;

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

		const services = [
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
