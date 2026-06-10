import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * Parse an ISO-ish timestamp into a real instant.
 *
 * SQLite's `datetime('now')` (used for `post_history.ran_at`) yields a UTC
 * string like "2026-06-06 14:00:00" with NO timezone marker. `new Date()` would
 * treat that as local time and lose the offset, so we normalise bare timestamps
 * to explicit UTC. Strings that already carry a zone (e.g. `toISOString()` with
 * a trailing `Z`, or an `+HH:MM` offset) are left untouched.
 */
function toInstant(iso: string): Date {
	const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
	return new Date(hasZone ? iso : iso.replace(' ', 'T') + 'Z');
}

/**
 * Format an ISO timestamp using a date-fns format string.
 * Pass the format string from `$page.data.dateFormat` and the timezone from
 * `$page.data.tz` (both set on the layout via CALENDARR_DATE_FORMAT / TZ) so the
 * whole app shares one format and renders in the user's timezone rather than the
 * server's. Falls back to DEFAULT_DATE_FORMAT / local time when omitted.
 */
export function fmtDateTime(
	iso: string | null | undefined,
	fmt: string = DEFAULT_DATE_FORMAT,
	tz?: string
): string {
	if (!iso) return '—';
	const d = toInstant(iso);
	if (Number.isNaN(d.getTime())) return iso;
	try {
		return tz ? formatInTimeZone(d, tz, fmt) : format(d, fmt);
	} catch {
		return tz ? formatInTimeZone(d, tz, DEFAULT_DATE_FORMAT) : format(d, DEFAULT_DATE_FORMAT);
	}
}
