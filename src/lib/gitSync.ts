import path from "node:path";
import { echo } from "@atums/echo";

export async function syncGitRepository(
	cacheDir: string,
	repoUrl: string,
	serviceName: string,
): Promise<void> {
	const repoExists = await Bun.file(
		path.join(cacheDir, ".git/config"),
	).exists();

	echo.debug(
		`${serviceName}: Repository ${repoExists ? "exists, updating" : "not found, cloning"}`,
	);

	if (!repoExists) {
		echo.debug(`${serviceName}: Cloning repository from GitHub...`);
		const cloneProc = Bun.spawn(["git", "clone", repoUrl, cacheDir]);
		const exitCode = await cloneProc.exited;
		if (exitCode !== 0) {
			throw new Error(
				`${serviceName}: Git clone failed with exit code ${exitCode}`,
			);
		}
		echo.debug(`${serviceName}: Repository cloned successfully`);
	} else {
		echo.debug(`${serviceName}: Pulling latest changes...`);
		const pullProc = Bun.spawn(["git", "pull"], {
			cwd: cacheDir,
		});
		const exitCode = await pullProc.exited;
		if (exitCode !== 0) {
			throw new Error(
				`${serviceName}: Git pull failed with exit code ${exitCode}`,
			);
		}
		echo.debug(`${serviceName}: Repository updated successfully`);
	}
}
