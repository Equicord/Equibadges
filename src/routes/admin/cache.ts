import { adminConfig, badgeServices } from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import { createErrorResponse } from "@lib/errorResponse";

const routeDef: RouteDef = {
	method: ["POST", "GET"],
	accepts: "*/*",
	returns: "application/json",
};

async function handler(request: ExtendedRequest): Promise<Response> {
	const apiKey = request.headers.get("X-Admin-API-Key");
	if (!adminConfig.apiKey || apiKey !== adminConfig.apiKey) {
		return createErrorResponse(
			401,
			"Unauthorized",
			"Invalid or missing admin API key",
		);
	}

	const url = new URL(request.url);
	const pathParts = url.pathname.split("/").filter(Boolean);
	const action = pathParts[pathParts.length - 1];

	try {
		switch (action) {
			case "refresh": {
				const service = request.query.service;
				if (!service) {
					return createErrorResponse(
						400,
						"Missing service parameter",
						"Please provide ?service=<name> or ?service=all",
					);
				}

				if (service === "all") {
					const services = badgeServices.map((s) => s.service);
					const results: Record<string, { success: boolean; error?: string }> =
						{};

					for (const svc of services) {
						try {
							await badgeCacheManager.forceUpdateService(svc);
							results[svc] = { success: true };
						} catch (error) {
							results[svc] = {
								success: false,
								error: error instanceof Error ? error.message : String(error),
							};
						}
					}

					return Response.json({
						status: 200,
						message: "Refreshed all services",
						results,
					});
				}

				await badgeCacheManager.forceUpdateService(service);
				return Response.json({
					status: 200,
					message: `Successfully refreshed cache for service: ${service}`,
				});
			}

			case "clear": {
				const service = request.query.service;

				const deletedCount = await badgeCacheManager.clearCache(service);

				return Response.json({
					status: 200,
					message: service
						? `Cleared cache for service: ${service}`
						: "Cleared cache for all services",
					deletedKeys: deletedCount,
				});
			}

			case "metrics": {
				const metrics = badgeCacheManager.getMetrics();
				return Response.json({
					status: 200,
					metrics,
				});
			}

			case "reset-metrics": {
				badgeCacheManager.resetMetrics();
				return Response.json({
					status: 200,
					message: "Metrics reset successfully",
				});
			}

			default:
				return createErrorResponse(
					404,
					"Unknown action",
					"Valid actions: /admin/cache/refresh, /admin/cache/clear, /admin/cache/metrics, /admin/cache/reset-metrics",
				);
		}
	} catch (error) {
		return createErrorResponse(
			500,
			"Operation failed",
			error instanceof Error ? error.message : String(error),
		);
	}
}

export { handler, routeDef };
