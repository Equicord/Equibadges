export function isValidBooleanString(value: string): boolean {
	return value === "true" || value === "false";
}

export function parseBooleanString(
	value: string | undefined,
	defaultValue: boolean,
): boolean {
	if (value === undefined) return defaultValue;
	if (!isValidBooleanString(value)) return defaultValue;
	return value === "true";
}

export function validateBadgesQuery(
	query: BadgesQueryParams,
): ValidationResult<NormalizedBadgesQuery> {
	const errors: string[] = [];
	const normalized = {
		cache: parseBooleanString(query.cache, true),
		separated: parseBooleanString(query.separated, false),
		capitalize: parseBooleanString(query.capitalize, false),
	};

	if (query.cache && !isValidBooleanString(query.cache)) {
		errors.push("'cache' parameter must be 'true' or 'false'");
	}

	if (query.separated && !isValidBooleanString(query.separated)) {
		errors.push("'separated' parameter must be 'true' or 'false'");
	}

	if (query.capitalize && !isValidBooleanString(query.capitalize)) {
		errors.push("'capitalize' parameter must be 'true' or 'false'");
	}

	return {
		valid: errors.length === 0,
		errors,
		normalized,
	};
}
