import type { CalendarItem, ReleaseType } from '$lib/types';
import { type AdapterInput, type ArrAdapter, arrFetch, trimUrl } from './types';

interface RadarrMovie {
	id: number;
	title: string;
	hasFile: boolean;
	inCinemas?: string;
	digitalRelease?: string;
	physicalRelease?: string;
}

interface RadarrStatus {
	version?: string;
}

export class RadarrAdapter implements ArrAdapter {
	constructor(private readonly input: AdapterInput) {}

	async testConnection() {
		const url = `${trimUrl(this.input.baseUrl)}/api/v3/system/status`;
		const start = Date.now();
		try {
			const res = await arrFetch(url, this.input.apiKey);
			const body = (await res.json()) as RadarrStatus;
			return { ok: true, version: body.version, latencyMs: Date.now() - start };
		} catch (e) {
			return { ok: false, error: (e as Error).message };
		}
	}

	async fetchCalendar(startUtc: Date, endUtc: Date): Promise<CalendarItem[]> {
		const params = new URLSearchParams({
			start: startUtc.toISOString(),
			end: endUtc.toISOString(),
			unmonitored: 'false'
		});
		const url = `${trimUrl(this.input.baseUrl)}/api/v3/calendar?${params}`;
		const res = await arrFetch(url, this.input.apiKey);
		const movies = (await res.json()) as RadarrMovie[];
		const items: CalendarItem[] = [];
		for (const m of movies) {
			const item = mapMovie(m, startUtc, endUtc);
			if (item) items.push(item);
		}
		return items;
	}
}

/**
 * Picks the first of digitalRelease -> physicalRelease -> inCinemas that falls
 * inside [start, end]. Returns null if none do.
 */
export function mapMovie(m: RadarrMovie, startUtc: Date, endUtc: Date): CalendarItem | null {
	const startMs = startUtc.getTime();
	const endMs = endUtc.getTime();
	const candidates: Array<{ when: string; type: ReleaseType }> = [];
	if (m.digitalRelease) candidates.push({ when: m.digitalRelease, type: 'digital' });
	if (m.physicalRelease) candidates.push({ when: m.physicalRelease, type: 'physical' });
	if (m.inCinemas) candidates.push({ when: m.inCinemas, type: 'cinema' });
	for (const c of candidates) {
		const ms = Date.parse(c.when);
		if (Number.isFinite(ms) && ms >= startMs && ms <= endMs) {
			return {
				kind: 'radarr',
				whenUtc: new Date(ms).toISOString(),
				title: m.title,
				releaseType: c.type,
				hasFile: !!m.hasFile
			};
		}
	}
	return null;
}
