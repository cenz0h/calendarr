import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schedulesRepo } from '$lib/server/db/repositories/schedules';
import { executeSchedule } from '$lib/server/scheduler/executor';

export const POST: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id!, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');
	const s = schedulesRepo.get(id);
	if (!s) error(404, 'not found');
	const summary = await executeSchedule(s, 'manual');
	return json(summary);
};
