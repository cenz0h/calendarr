import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { makeAdapter } from '$lib/server/arr/registry';

export const POST: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id!, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');
	const service = servicesRepo.get(id);
	if (!service) error(404, 'not found');
	const result = await makeAdapter(service).testConnection();
	return json(result);
};
