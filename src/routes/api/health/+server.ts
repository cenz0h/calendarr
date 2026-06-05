import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { APP_VERSION } from '$lib/server/config';
import { jobCount } from '$lib/server/scheduler/runner';

export const GET: RequestHandler = () => {
	return json({ ok: true, version: APP_VERSION, scheduler: { jobs: jobCount() } });
};
