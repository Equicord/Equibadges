import { badgeServices } from "@config";
import { fetchBadges } from "@lib/badges";
import { parseServices, validateID } from "@lib/char";

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
	const {
		services,
		cache = "true",
		seperated = "false",
		capitalize = "false",
	} = request.query;

	if (!validateID(userId)) {
		return Response.json(
			{
				status: 400,
				error: "Invalid Discord User ID. Must be 17-20 digits.",
			},
			{ status: 400 },
		);
	}

	let validServices: string[];
	const availableServices = badgeServices.map((b) => b.service);

	if (services) {
		const parsed = parseServices(services);
		if (parsed.length === 0) {
			return Response.json(
				{
					status: 400,
					error: "No valid services provided",
					availableServices,
				},
				{ status: 400 },
			);
		}

		if (!isValidServices(parsed)) {
			return Response.json(
				{
					status: 400,
					error: "Invalid service(s) provided",
					availableServices,
					provided: parsed,
				},
				{ status: 400 },
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
			nocache: cache !== "true",
			separated: seperated === "true",
		},
		request,
	);

	const isEmpty = Array.isArray(badges)
		? badges.length === 0
		: Object.keys(badges).length === 0;

	if (isEmpty) {
		return Response.json(
			{
				status: 404,
				error: "No badges found for this user",
				services: validServices,
			},
			{ status: 404 },
		);
	}

	let responseBadges = badges;
	if (capitalize === "true" && !Array.isArray(badges)) {
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
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		},
	);
}

export { handler, routeDef };
