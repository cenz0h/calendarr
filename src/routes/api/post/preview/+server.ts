import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { makeAdapter } from '$lib/server/arr/registry';
import { buildPayload } from '$lib/server/discord/format';
import { DEFAULT_TZ } from '$lib/server/config';

interface Body {
	serviceId: number;
	windowDays?: number;
	timezone?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as Body;
	if (!body.serviceId) error(400, 'serviceId required');
	const service = servicesRepo.get(body.serviceId);
	if (!service) error(404, 'service not found');

	const windowDays = body.windowDays ?? 7;
	const timezone = body.timezone || DEFAULT_TZ;
	const now = new Date();
	const endUtc = new Date(now.getTime() + windowDays * 86_400_000);
	const items = await makeAdapter(service).fetchCalendar(now, endUtc);
	const payload = buildPayload({ service, items, windowDays, timezone, now });
	return json({ payload, itemCount: items.length });
};
