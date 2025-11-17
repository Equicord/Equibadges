import path from "node:path";
import { echo } from "@atums/echo";

const environment: Environment = {
	port: Number.parseInt(process.env.PORT || "8080", 10),
	host: process.env.HOST || "0.0.0.0",
	development:
		process.env.NODE_ENV === "development" || process.argv.includes("--dev"),
};

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = SECONDS_PER_HOUR * MILLISECONDS_PER_SECOND;

const redisTtl: number = process.env.REDIS_TTL
	? Number.parseInt(process.env.REDIS_TTL, 10)
	: SECONDS_PER_HOUR; // 1 hour

const badgeFetchInterval: number = process.env.BADGE_FETCH_INTERVAL
	? Number.parseInt(process.env.BADGE_FETCH_INTERVAL, 10)
	: MILLISECONDS_PER_HOUR; // 1 hour

const botToken: string | undefined = process.env.DISCORD_TOKEN;

const githubToken: string | undefined = process.env.GITHUB_TOKEN;

const cachePaths = {
	badgevault: path.resolve(process.cwd(), "cache/badgevault"),
	enmity: path.resolve(process.cwd(), "cache/enmity"),
};

const blocklistConfig = {
	enabled: process.env.BLOCKLIST_ENABLED !== "false",
};

const cacheConfig = {
	version: process.env.CACHE_VERSION || "v1",
	redisTimeout: process.env.REDIS_TIMEOUT
		? Number.parseInt(process.env.REDIS_TIMEOUT, 10)
		: 5000,
	httpFetchTimeout: process.env.HTTP_FETCH_TIMEOUT
		? Number.parseInt(process.env.HTTP_FETCH_TIMEOUT, 10)
		: 10000,
	httpFetchRetries: process.env.HTTP_FETCH_RETRIES
		? Number.parseInt(process.env.HTTP_FETCH_RETRIES, 10)
		: 3,
	preloadOnStartup: process.env.CACHE_PRELOAD_ON_STARTUP !== "false",
};

const adminConfig = {
	apiKey: process.env.ADMIN_API_KEY,
};

function verifyRequiredVariables(): void {
	const requiredVariables = ["REDIS_URL"];

	let hasError = false;

	for (const key of requiredVariables) {
		const value = process.env[key];
		if (value === undefined || value.trim() === "") {
			echo.error(`Missing or empty environment variable: ${key}`);
			hasError = true;
		}
	}

	if (hasError) {
		process.exit(1);
	}
}

export * from "@config/constants";
export {
	SECONDS_PER_MINUTE,
	MINUTES_PER_HOUR,
	SECONDS_PER_HOUR,
	MILLISECONDS_PER_SECOND,
	MILLISECONDS_PER_MINUTE,
	MILLISECONDS_PER_HOUR,
	environment,
	redisTtl,
	badgeFetchInterval,
	botToken,
	githubToken,
	cachePaths,
	blocklistConfig,
	cacheConfig,
	adminConfig,
	verifyRequiredVariables,
};
