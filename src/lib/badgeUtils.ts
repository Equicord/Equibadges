export function determineBadgeType(
	text: string,
	keywords: Record<string, string[]>,
	defaultType = "developer",
): string {
	const textLower = text.toLowerCase();

	for (const [badgeType, keywordList] of Object.entries(keywords)) {
		for (const keyword of keywordList) {
			if (textLower.includes(keyword)) {
				return badgeType;
			}
		}
	}

	return defaultType;
}

export const AERO_BADGE_KEYWORDS: Record<string, string[]> = {
	contributor: ["contributor"],
	tester: ["tester"],
	developer: ["developer"],
};

export const VELOCITY_BADGE_KEYWORDS: Record<string, string[]> = {
	contributor: ["contributor"],
	translator: ["translator"],
	early: ["early"],
	developer: ["developer"],
};

export const ENMITY_BADGE_KEYWORDS: Record<string, string[]> = {
	dev: ["dev"],
	staff: ["staff"],
	supporter: ["support"],
	contributor: ["contributor"],
};
