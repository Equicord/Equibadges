import path from "node:path";
import { echo } from "@atums/echo";

export async function syncGitRepository(
	cacheDir: string,
	repoUrl: string,
	serviceName: string,
	githubToken?: string,
): Promise<void> {
	const repoExists = await Bun.file(
		path.join(cacheDir, ".git/config"),
	).exists();

	echo.debug(
		`${serviceName}: Repository ${repoExists ? "exists, updating" : "not found, cloning"}`,
	);

	const authenticatedUrl = githubToken
		? repoUrl.replace("https://", `https://${githubToken}@`)
		: repoUrl;

	if (!repoExists) {
		echo.debug(`${serviceName}: Cloning repository from GitHub...`);
		const cloneProc = Bun.spawn(["git", "clone", authenticatedUrl, cacheDir]);
		await cloneProc.exited;
		echo.debug(`${serviceName}: Repository cloned successfully`);
	} else {
		echo.debug(`${serviceName}: Pulling latest changes...`);
		const pullProc = Bun.spawn(["git", "pull"], {
			cwd: cacheDir,
		});
		await pullProc.exited;
		echo.debug(`${serviceName}: Repository updated successfully`);
	}
}
