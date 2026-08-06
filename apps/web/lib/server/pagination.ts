export interface PageParams {
	page?: number;
	limit?: number;
}

export interface NormalizedPage {
	page: number;
	limit: number;
	offset: number;
}

export function normalizePageParams(params: PageParams = {}): NormalizedPage {
	const page = Math.max(1, params.page ?? 1);
	const limit = Math.min(100, Math.max(1, params.limit ?? 10));
	return { page, limit, offset: (page - 1) * limit };
}

export function createPageMeta(total: number, pagination: NormalizedPage) {
	return {
		total,
		page: pagination.page,
		limit: pagination.limit,
		totalPages: Math.ceil(total / pagination.limit),
	};
}
