import type { PageServerLoad } from './$types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { redactService } from '$lib/server/api-helpers';
import { DEFAULT_TZ } from '$lib/server/config';

export const load: PageServerLoad = () => {
	return { services: servicesRepo.list().map(redactService), defaultTz: DEFAULT_TZ };
};
