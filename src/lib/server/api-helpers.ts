import type { ArrService } from '$lib/types';

/** Redact api_key for any list/get response. */
export function redactService(s: ArrService): ArrService {
	return { ...s, apiKey: s.apiKey ? '***' : '' };
}
