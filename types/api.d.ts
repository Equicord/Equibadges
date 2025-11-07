interface ErrorResponse {
	success: false;
	code: number;
	error: string;
	reason?: string;
	[key: string]: unknown;
}

interface SuccessResponse<T = unknown> {
	success: true;
	data: T;
}

interface ValidationResult<T> {
	valid: boolean;
	errors: string[];
	normalized: T;
}

interface BadgesQueryParams {
	services?: string;
	exclude?: string;
	cache?: string;
	separated?: string;
	capitalize?: string;
}

interface NormalizedBadgesQuery {
	cache: boolean;
	separated: boolean;
	capitalize: boolean;
}
