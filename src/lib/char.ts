function validateID(id: string | undefined): boolean {
	if (!id) return false;

	return /^\d{17,20}$/.test(id.trim());
}

function parseServices(input: string): string[] {
	return input
		.split(/[\s,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

export { parseServices, validateID };
