import type { ArrKind, CalendarItem } from '$lib/types';

export interface ArrAdapter {
	testConnection(): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }>;
	fetchCalendar(startUtc: Date, endUtc: Date): Promise<CalendarItem[]>;
}

export interface AdapterInput {
	baseUrl: string;
	apiKey: string;
	kind: ArrKind;
}

export class ArrAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ArrAuthError';
	}
}

export class ArrUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ArrUnavailableError';
	}
}

export function trimUrl(url: string): string {
	return url.replace(/\/+$/, '');
}

export async function arrFetch(
	url: string,
	apiKey: string,
	signal?: AbortSignal
): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, {
			headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
			signal: signal ?? AbortSignal.timeout(10_000)
		});
	} catch (e) {
		throw new ArrUnavailableError(`network error: ${(e as Error).message}`);
	}
	if (res.status === 401 || res.status === 403) {
		throw new ArrAuthError(`auth failed (${res.status}) — check API key`);
	}
	if (!res.ok) {
		throw new ArrUnavailableError(`HTTP ${res.status}: ${await res.text().catch(() => '')}`);
	}
	return res;
}
