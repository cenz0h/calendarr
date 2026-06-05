import { initDb } from '$lib/server/db';
import { initScheduler } from '$lib/server/scheduler/runner';
import { CALENDARR_DATE_FORMAT } from '$lib/server/config';

// Belt-and-braces: hooks.server.ts boots these at module load, but call again
// to be safe across dev HMR. Both functions are idempotent.
initDb();
initScheduler();

export const load = () => ({ dateFormat: CALENDARR_DATE_FORMAT });
