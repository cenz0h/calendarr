import type { ArrKind } from '$lib/types';

export const SERVICE_COLORS: Record<ArrKind, number> = {
	sonarr: 0x35c5f0,
	radarr: 0xffc230
};

/**
 * Per-weekday color palette (Tailwind 500-level). Sunday = 0 through Saturday = 6.
 * Used to color one embed per day so the same weekday is always the same color
 * across posts and easy to spot at a glance.
 */
export const WEEKDAY_COLORS: Record<number, number> = {
	0: 0x06b6d4, // Sun - cyan
	1: 0x0ea5e9, // Mon - sky
	2: 0x10b981, // Tue - emerald
	3: 0xf59e0b, // Wed - amber
	4: 0xf97316, // Thu - orange
	5: 0xf43f5e, // Fri - rose
	6: 0x8b5cf6 // Sat - violet
};

export function colorForService(kind: ArrKind): number {
	return SERVICE_COLORS[kind];
}

/** dayKey is yyyy-MM-dd (already in the schedule's TZ). */
export function colorForDayKey(dayKey: string): number {
	const d = new Date(dayKey + 'T00:00:00Z');
	return WEEKDAY_COLORS[d.getUTCDay()] ?? 0x64748b;
}
