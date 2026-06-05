import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { servicesRepo, type ServiceInput } from '$lib/server/db/repositories/services';
import { redactService } from '$lib/server/api-helpers';

export const GET: RequestHandler = () => {
	return json({ services: servicesRepo.list().map(redactService) });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as ServiceInput;
	if (!body.name || !body.kind || !body.baseUrl || !body.apiKey || !body.webhookUrl) {
		error(400, 'name, kind, baseUrl, apiKey and webhookUrl are required');
	}
	if (body.kind !== 'sonarr' && body.kind !== 'radarr') error(400, 'kind must be sonarr or radarr');
	const service = servicesRepo.create(body);
	return json({ service: redactService(service) }, { status: 201 });
};
