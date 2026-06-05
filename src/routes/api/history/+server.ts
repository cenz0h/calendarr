import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { historyRepo } from '$lib/server/db/repositories/history';
import type { PostStatus } from '$lib/types';

export const GET: RequestHandler = ({ url }) => {
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
	const serviceIdParam = url.searchParams.get('serviceId');
	const statusParam = url.searchParams.get('status') as PostStatus | null;
	const serviceId = serviceIdParam ? parseInt(serviceIdParam, 10) : undefined;
	const status = statusParam && ['success', 'skipped_empty', 'error'].includes(statusParam) ? statusParam : undefined;
	return json(historyRepo.list({ limit, offset, serviceId, status }));
};
