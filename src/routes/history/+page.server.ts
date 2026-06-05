import type { PageServerLoad } from './$types';
import { historyRepo } from '$lib/server/db/repositories/history';
import type { PostStatus } from '$lib/types';

export const load: PageServerLoad = ({ url }) => {
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
	const statusParam = url.searchParams.get('status') as PostStatus | null;
	const status =
		statusParam && ['success', 'skipped_empty', 'error'].includes(statusParam) ? statusParam : undefined;
	const serviceIdParam = url.searchParams.get('serviceId');
	const serviceId = serviceIdParam ? parseInt(serviceIdParam, 10) : undefined;
	const { rows, total } = historyRepo.list({ limit, offset, status, serviceId });
	return { rows, total, limit, offset, status, serviceId };
};
