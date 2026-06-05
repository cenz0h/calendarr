import type { PageServerLoad } from './$types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { redactService } from '$lib/server/api-helpers';

export const load: PageServerLoad = () => {
	return { services: servicesRepo.list().map(redactService) };
};
