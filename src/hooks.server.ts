import type { Handle } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { initScheduler } from '$lib/server/scheduler/runner';
import { log } from '$lib/server/logger';

const logger = log('boot');

let booted = false;
function boot(): void {
	if (booted) return;
	booted = true;
	initDb();
	initScheduler();
	logger.info('Calendarr is ready');
}

boot();

export const handle: Handle = async ({ event, resolve }) => {
	boot();
	return resolve(event);
};
