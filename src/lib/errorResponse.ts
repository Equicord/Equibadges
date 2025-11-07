export function createErrorResponse(
	code: number,
	error: string,
	reason?: string,
	additionalData?: Record<string, unknown>,
	headers?: HeadersInit,
): Response {
	const body: ErrorResponse = {
		success: false,
		code,
		error,
	};

	if (reason) {
		body.reason = reason;
	}

	if (additionalData) {
		Object.assign(body, additionalData);
	}

	const options: ResponseInit = { status: code };
	if (headers) {
		options.headers = headers;
	}

	return Response.json(body, options);
}

export function createSuccessResponse<T>(data: T, status = 200): Response {
	const body: SuccessResponse<T> = {
		success: true,
		data,
	};

	return Response.json(body, { status });
}
