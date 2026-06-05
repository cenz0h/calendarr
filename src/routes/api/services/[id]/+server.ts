import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { servicesRepo, type ServiceInput } from '$lib/server/db/repositories/services';
import { redactService } from '$lib/server/api-helpers';

function parseId(idStr: string): number {
	const id = parseInt(idStr, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');
	return id;
}

export const GET: RequestHandler = ({ params }) => {
	const id = parseId(params.id!);
	const s = servicesRepo.get(id);
	if (!s) error(404, 'not found');
	return json({ service: redactService(s) });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params.id!);
	const body = (await request.json()) as Partial<ServiceInput>;
	const updated = servicesRepo.update(id, body);
	if (!updated) error(404, 'not found');
	return json({ service: redactService(updated) });
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = parseId(params.id!);
	const ok = servicesRepo.remove(id);
	if (!ok) error(404, 'not found');
	return json({ ok: true });
};
