import path from "node:path";
import { echo } from "@atums/echo";

const GIT_TIMEOUT_MS = 120_000;

async function runGitCommand(
	args: string[],
	serviceName: string,
	cwd?: string,
): Promise<void> {
	const proc = Bun.spawn(["git", ...args], {
		...(cwd ? { cwd } : {}),
		stdin: "ignore",
		stdout: "ignore",
		stderr: "pipe",
	});

	const stderrPromise = new Response(proc.stderr).text();

	let timedOut = false;
	const killTimer = setTimeout(() => {
		timedOut = true;
		echo.warn(
			`${serviceName}: git ${args[0]} timed out after ${GIT_TIMEOUT_MS}ms, killing process`,
		);
		proc.kill("SIGKILL");
	}, GIT_TIMEOUT_MS);

	try {
		const exitCode = await proc.exited;

		if (timedOut) {
			throw new Error(
				`${serviceName}: git ${args[0]} timed out after ${GIT_TIMEOUT_MS}ms`,
			);
		}

		if (exitCode !== 0) {
			const stderr = (await stderrPromise).trim();
			throw new Error(
				`${serviceName}: git ${args[0]} failed with exit code ${exitCode}${stderr ? `: ${stderr}` : ""}`,
			);
		}
	} finally {
		clearTimeout(killTimer);
	}
}

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
		await runGitCommand(
			["clone", "--depth", "1", repoUrl, cacheDir],
			serviceName,
		);
		echo.debug(`${serviceName}: Repository cloned successfully`);
	} else {
		echo.debug(`${serviceName}: Pulling latest changes...`);
		await runGitCommand(["pull"], serviceName, cacheDir);
		echo.debug(`${serviceName}: Repository updated successfully`);
	}
}
