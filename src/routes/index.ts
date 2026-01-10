import { badgeServices, getServiceDescription, gitUrl } from "@config";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	parts.push(`${secs}s`);

	return parts.join(" ");
}

async function handler(): Promise<Response> {
	const uptimeSeconds = process.uptime();
	const services = badgeServices.map((service) => ({
		name: service.service,
		description: getServiceDescription(service.service),
	}));

	const response = {
		name: "Badge API",
		description: "Aggregated Discord badge API for various client mods",
		author: "creations",
		repository: gitUrl,
		uptime: formatUptime(uptimeSeconds),
		uptimeSeconds: Math.floor(uptimeSeconds),
		totalServices: services.length,
		routes: {
			"GET /": "API information and available routes",
			"GET /:userId": "Get badges for a Discord user by ID",
			"GET /users": "Get all users and their badges from all services",
			"GET /health": "Health check endpoint",
		},
		endpoints: {
			badges: {
				path: "/:userId",
				method: "GET",
				description: "Fetch badges for a Discord user",
				parameters: {
					path: {
						userId: "Discord User ID (17-20 digits)",
					},
					query: {
						services:
							"Comma/space separated list of services to include (optional, defaults to all)",
						exclude:
							"Comma/space separated list of services to exclude (optional)",
						cache: "Enable/disable caching (true/false, default: true)",
						separated:
							"Return results grouped by service (true/false, default: false)",
					},
				},
				examples: [
					"/:userId",
					"/:userId?services=discord,vencord",
					"/:userId?exclude=discord&separated=true",
				],
			},
			users: {
				path: "/users",
				method: "GET",
				description:
					"Get all users with badges across all supported services",
				response: {
					totalUsers: "Total number of users with badges",
					users: "Object mapping user IDs to their badges",
				},
			},
			health: {
				path: "/health",
				method: "GET",
				description: "Check API health status",
			},
		},
		supportedServices: services,
	};

	return Response.json(response, {
		headers: {
			"Cache-Control": "public, max-age=300",
		},
	});
}

export { handler, routeDef };
