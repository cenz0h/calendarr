import type { PageServerLoad } from './$types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { schedulesRepo } from '$lib/server/db/repositories/schedules';
import { historyRepo } from '$lib/server/db/repositories/history';
import { redactService } from '$lib/server/api-helpers';
import { nextRun } from '$lib/server/scheduler/runner';

export const load: PageServerLoad = () => {
	const services = servicesRepo.list().map(redactService);
	const schedules = schedulesRepo.list();
	const nextRuns: Record<number, string | null> = {};
	for (const s of schedules) {
		const nr = nextRun(s.id);
		nextRuns[s.id] = nr ? nr.toISOString() : null;
	}
	const recent = historyRepo.list({ limit: 5 }).rows;
	return { services, schedules, nextRuns, recent };
};
