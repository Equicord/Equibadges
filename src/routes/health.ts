import { badgeServices, cacheConfig } from "@config";
import { redis } from "bun";

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

async function handler(): Promise<Response> {
	const health: HealthResponse = {
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		services: {
			redis: "unknown",
		},
		cache: {
			lastFetched: {},
			nextUpdate: null,
		},
	};

	try {
		await redis.connect();
		health.services.redis = "ok";
	} catch {
		health.services.redis = "error";
		health.status = "degraded";
	}

	if (health.services.redis === "ok") {
		const services = getStaticServices();
		const timestampPrefix = `badge_cache_timestamp:${cacheConfig.version}:`;

		try {
			const timestamps = await Promise.all(
				services.map(async (service) => {
					const timestamp = await redis.get(`${timestampPrefix}${service}`);
					return {
						service,
						timestamp: timestamp ? Number.parseInt(timestamp, 10) : null,
					};
				}),
			);

			const lastFetched: Record<string, CacheInfo> = {};
			let oldestTimestamp: number | null = null;

			for (const { service, timestamp } of timestamps) {
				if (timestamp) {
					const date = new Date(timestamp);
					lastFetched[service] = {
						timestamp: date.toISOString(),
						age: `${Math.floor((Date.now() - timestamp) / 1000)}s ago`,
					};

					if (!oldestTimestamp || timestamp < oldestTimestamp) {
						oldestTimestamp = timestamp;
					}
				} else {
					lastFetched[service] = {
						timestamp: null,
						age: "never",
					};
				}
			}

			health.cache.lastFetched = lastFetched;

			if (oldestTimestamp) {
				const nextUpdate = new Date(oldestTimestamp + 60 * 60 * 1000);
				health.cache.nextUpdate = nextUpdate.toISOString();
			}
		} catch {
			health.cache.lastFetched = { error: "Failed to fetch cache timestamps" };
		}
	}

	const status = health.status === "ok" ? 200 : 503;

	return Response.json(health, {
		status,
		headers: {
			"Cache-Control": "no-cache",
		},
	});
}

export { handler, routeDef };
