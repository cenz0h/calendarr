import type { ArrKind } from '$lib/types';

export const DEFAULT_PORTS: Record<ArrKind, string> = {
	sonarr: '8989',
	radarr: '7878'
};

/** Pull host (protocol+hostname+path) and port apart from a stored baseUrl. */
export function splitBaseUrl(url: string): { host: string; port: string } {
	if (!url) return { host: '', port: '' };
	try {
		const u = new URL(url);
		const path = u.pathname === '/' ? '' : u.pathname;
		return { host: `${u.protocol}//${u.hostname}${path}`, port: u.port };
	} catch {
		return { host: url, port: '' };
	}
}

/** Recombine host + port back into the URL stored on the service row. */
export function joinBaseUrl(host: string, port: string): string {
	const trimmed = (host ?? '').trim().replace(/\/+$/, '');
	if (!trimmed) return '';
	if (!port) return trimmed;
	try {
		const u = new URL(trimmed);
		u.port = port;
		return u.toString().replace(/\/$/, '');
	} catch {
		return `${trimmed}:${port}`;
	}
}
