import type { CalendarItem } from '$lib/types';
import { type AdapterInput, type ArrAdapter, arrFetch, trimUrl } from './types';

interface SonarrSeries {
	title: string;
}

interface SonarrEpisode {
	id: number;
	airDateUtc: string;
	seasonNumber: number;
	episodeNumber: number;
	title: string;
	hasFile: boolean;
	series?: SonarrSeries;
	seriesTitle?: string;
}

interface SonarrStatus {
	version?: string;
}

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export class SonarrAdapter implements ArrAdapter {
	constructor(private readonly input: AdapterInput) {}

	async testConnection() {
		const url = `${trimUrl(this.input.baseUrl)}/api/v3/system/status`;
		const start = Date.now();
		try {
			const res = await arrFetch(url, this.input.apiKey);
			const body = (await res.json()) as SonarrStatus;
			return { ok: true, version: body.version, latencyMs: Date.now() - start };
		} catch (e) {
			return { ok: false, error: (e as Error).message };
		}
	}

	async fetchCalendar(startUtc: Date, endUtc: Date): Promise<CalendarItem[]> {
		const params = new URLSearchParams({
			start: startUtc.toISOString(),
			end: endUtc.toISOString(),
			includeSeries: 'true',
			unmonitored: 'false'
		});
		const url = `${trimUrl(this.input.baseUrl)}/api/v3/calendar?${params}`;
		const res = await arrFetch(url, this.input.apiKey);
		const eps = (await res.json()) as SonarrEpisode[];
		return eps
			.filter((e) => !!e.airDateUtc)
			.map((e) => mapEpisode(e));
	}
}

export function mapEpisode(e: SonarrEpisode): CalendarItem {
	const seriesTitle = e.series?.title ?? e.seriesTitle ?? 'Unknown series';
	const episodeCode = `S${pad2(e.seasonNumber)}E${pad2(e.episodeNumber)}`;
	return {
		kind: 'sonarr',
		whenUtc: e.airDateUtc,
		title: seriesTitle,
		episodeCode,
		episodeTitle: e.title,
		hasFile: !!e.hasFile
	};
}
