import { badgeServices, getServiceDescription, gitUrl } from "@config";

const routeDef: RouteDef = {
	method: "GET",
	accepts: "*/*",
	returns: "application/json",
};

async function handler(): Promise<Response> {
	const response = {
		author: "creations",
		repository: gitUrl,
		uptime: `${process.uptime()}s`,
		routes: {
			"GET /": "API information and available routes",
			"GET /:userId": "Get badges for a Discord user",
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
						services: "Comma/space separated list of services (optional)",
						cache: "Enable/disable caching (true/false, default: true)",
						separated:
							"Return results grouped by service (true/false, default: false)",
					},
				},
				example: "/:userId?services=discord,vencord&separated=true&cache=true",
			},
		},
		supportedServices: badgeServices.map((service) => ({
			name: service.service,
			description: getServiceDescription(service.service),
		})),
	};

	return Response.json(response, {
		headers: {
			"Cache-Control": "public, max-age=300",
		},
	});
}

export { handler, routeDef };
