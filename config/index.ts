import path from "node:path";
import { echo } from "@atums/echo";

const environment: Environment = {
	port: Number.parseInt(process.env.PORT || "8080", 10),
	host: process.env.HOST || "0.0.0.0",
	development:
		process.env.NODE_ENV === "development" || process.argv.includes("--dev"),
};

const redisTtl: number = process.env.REDIS_TTL
	? Number.parseInt(process.env.REDIS_TTL, 10)
	: 60 * 60 * 1; // 1 hour

const badgeFetchInterval: number = process.env.BADGE_FETCH_INTERVAL
	? Number.parseInt(process.env.BADGE_FETCH_INTERVAL, 10)
	: 60 * 60 * 1000; // 1 hour

const botToken: string | undefined = process.env.DISCORD_TOKEN;

const githubToken: string | undefined = process.env.GITHUB_TOKEN;

const cachePaths = {
	badgevault: path.resolve(process.cwd(), "cache/badgevault"),
	enmity: path.resolve(process.cwd(), "cache/enmity"),
};

const rateLimitConfig = {
	enabled: process.env.RATE_LIMIT_ENABLED !== "false",
	windowMs: process.env.RATE_LIMIT_WINDOW_MS
		? Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
		: 60 * 1000,
	maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS
		? Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
		: 60,
};

const blocklistConfig = {
	enabled: process.env.BLOCKLIST_ENABLED !== "false",
};

function verifyRequiredVariables(): void {
	const requiredVariables = ["REDIS_URL", "DISCORD_TOKEN"];

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
	environment,
	redisTtl,
	badgeFetchInterval,
	botToken,
	githubToken,
	cachePaths,
	rateLimitConfig,
	blocklistConfig,
	verifyRequiredVariables,
};
