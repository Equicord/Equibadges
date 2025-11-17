import { badgeServices, blocklistConfig } from "@config";
import { fetchBadges } from "@lib/badges";
import { parseServices, validateID } from "@lib/char";
import { createErrorResponse } from "@lib/errorResponse";
import { blocklist } from "@lib/security";
import { validateBadgesQuery } from "@lib/validation";

function isValidServices(services: string[]): boolean {
	if (!Array.isArray(services)) return false;
	if (services.length === 0) return false;

	const validServices = badgeServices.map((s) => s.service.toLowerCase());
	return services.every((s) => validServices.includes(s.toLowerCase()));
}

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const { id: userId } = request.params;
	const { services, exclude, seperated, ...queryParams } = request.query;

	if (seperated !== undefined && queryParams.separated === undefined) {
		queryParams.separated = seperated;
	}

	const validation = validateBadgesQuery(queryParams);
	if (!validation.valid) {
		return createErrorResponse(400, "Invalid query parameters", undefined, {
			errors: validation.errors,
		});
	}

	const { cache, separated, capitalize } = validation.normalized;

	if (!validateID(userId)) {
		return createErrorResponse(
			400,
			"Invalid Discord User ID. Must be 17-20 digits.",
		);
	}

	if (blocklistConfig.enabled && userId) {
		const userBlockedInfo = await blocklist.isUserBlocked(userId);
		if (userBlockedInfo.blocked) {
			return createErrorResponse(
				403,
				"User is blocked",
				userBlockedInfo.reason || "User is blocked from accessing badges",
			);
		}
	}

	let validServices: string[];
	const availableServices = badgeServices.map((b) => b.service);

	if (exclude) {
		const excludeList = parseServices(exclude);
		if (!isValidServices(excludeList)) {
			return createErrorResponse(
				400,
				"Invalid service(s) in exclude list",
				undefined,
				{ availableServices, provided: excludeList },
			);
		}

		const excludeLower = excludeList.map((s) => s.toLowerCase());
		validServices = availableServices.filter(
			(s) => !excludeLower.includes(s.toLowerCase()),
		);

		if (validServices.length === 0) {
			return createErrorResponse(
				400,
				"Exclude list cannot exclude all services",
				undefined,
				{ availableServices },
			);
		}
	} else if (services) {
		const parsed = parseServices(services);
		if (parsed.length === 0) {
			return createErrorResponse(400, "No valid services provided", undefined, {
				availableServices,
			});
		}

		if (!isValidServices(parsed)) {
			return createErrorResponse(
				400,
				"Invalid service(s) provided",
				undefined,
				{ availableServices, provided: parsed },
			);
		}

		validServices = parsed;
	} else {
		validServices = availableServices;
	}

	const badges = await fetchBadges(
		userId,
		validServices,
		{
			nocache: !cache,
			separated,
		},
		request,
	);

	const isEmpty = Array.isArray(badges)
		? badges.length === 0
		: Object.keys(badges).length === 0;

	if (isEmpty) {
		return createErrorResponse(
			404,
			"No badges found for this user",
			undefined,
			{ services: validServices },
		);
	}

	let responseBadges = badges;
	if (capitalize && !Array.isArray(badges)) {
		const serviceMap: Record<string, string> = {
			nekocord: "Nekocord",
			reviewdb: "ReviewDB",
			aero: "Aero",
			aliucord: "Aliucord",
			ra1ncord: "Ra1ncord",
			velocity: "Velocity",
			enmity: "Enmity",
			replugged: "Replugged",
			badgevault: "BadgeVault",
			vencord: "Vencord",
			equicord: "Equicord",
			discord: "Discord",
		};

		const capitalizedBadges: Record<string, Badge[]> = {};
		for (const [key, value] of Object.entries(badges)) {
			const capitalizedKey = serviceMap[key.toLowerCase()] || key;
			capitalizedBadges[capitalizedKey] = value;
		}
		responseBadges = capitalizedBadges;
	}

	const origin = request.headers.get("Origin") || "*";
	return Response.json(
		{
			status: 200,
			badges: responseBadges,
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

export { handler, routeDef };
