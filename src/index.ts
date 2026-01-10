import { echo } from "@atums/echo";
import { verifyRequiredVariables } from "@config";
import { badgeCacheManager } from "@lib/badgeCache";
import { serverHandler } from "@server";

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
	if (isShuttingDown) {
		echo.debug(`Already shutting down, ignoring ${signal}`);
		return;
	}
	isShuttingDown = true;

	echo.info(`Received ${signal}, shutting down gracefully...`);

	await serverHandler.waitForRequestsToComplete(30000);

	await badgeCacheManager.shutdown();

	echo.info("Shutdown complete");
	process.exit(0);
}

async function main(): Promise<void> {
	verifyRequiredVariables();

	await badgeCacheManager.initialize();

	process.on("SIGINT", () => {
		void gracefulShutdown("SIGINT");
	});

	process.on("SIGTERM", () => {
		void gracefulShutdown("SIGTERM");
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
