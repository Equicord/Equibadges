type Query = Record<string, string>;
type Params = Record<string, string>;

interface RateLimitInfo {
	limit: number;
	remaining: number;
	reset: number;
}

interface ExtendedRequest extends Request {
	startPerf: number;
	query: Query;
	params: Params;
	rateLimitInfo?: RateLimitInfo;
}
