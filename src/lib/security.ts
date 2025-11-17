import { Blocklist } from "@lib/blocklist";
import { redis } from "bun";

let blocklistInstance: Blocklist | null = null;

function getBlocklist(): Blocklist {
	if (!blocklistInstance) {
		blocklistInstance = new Blocklist(redis);
	}
	return blocklistInstance;
}

export const blocklist = new Proxy({} as Blocklist, {
	get(_, prop) {
		return getBlocklist()[prop as keyof Blocklist];
	},
});
