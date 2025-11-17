import { echo } from "@atums/echo";
import { verifyRequiredVariables } from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import { serverHandler } from "@server";

async function main(): Promise<void> {
	verifyRequiredVariables();

	await badgeCacheManager.initialize();

	process.on("SIGINT", () => {
		echo.debug("Received SIGINT, shutting down gracefully...");
		void (async () => {
			await badgeCacheManager.shutdown();
			process.exit(0);
		})();
	});

	process.on("SIGTERM", () => {
		echo.debug("Received SIGTERM, shutting down gracefully...");
		void (async () => {
			await badgeCacheManager.shutdown();
			process.exit(0);
		})();
	});

	serverHandler.initialize();
}

main().catch((error: Error) => {
	echo.error({
		message: "Error initializing the server",
		error: error.message,
	});
	process.exit(1);
});
