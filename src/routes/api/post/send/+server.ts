import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execute } from '$lib/server/scheduler/executor';
import { DEFAULT_TZ } from '$lib/server/config';

interface Body {
	serviceIds: number[];
	windowDays?: number;
	webhookOverride?: string;
	timezone?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Body;
	if (!Array.isArray(body.serviceIds) || body.serviceIds.length === 0) {
		error(400, 'serviceIds required');
	}
	const summary = await execute({
		scheduleId: null,
		trigger: 'manual',
		serviceIds: body.serviceIds,
		windowDays: body.windowDays ?? 7,
		timezone: body.timezone || DEFAULT_TZ,
		skipEmpty: false,
		webhookOverride: body.webhookOverride
	});
	return json(summary);
};
