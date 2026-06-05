import type { ArrService } from '$lib/types';
import { type ArrAdapter } from './types';
import { SonarrAdapter } from './sonarr';
import { RadarrAdapter } from './radarr';

export function makeAdapter(service: ArrService): ArrAdapter {
	const input = { baseUrl: service.baseUrl, apiKey: service.apiKey, kind: service.kind };
	switch (service.kind) {
		case 'sonarr':
			return new SonarrAdapter(input);
		case 'radarr':
			return new RadarrAdapter(input);
	}
}
