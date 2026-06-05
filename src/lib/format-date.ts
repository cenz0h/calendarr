import { format } from 'date-fns';

export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * Format an ISO timestamp using a date-fns format string.
 * Pass the format string from `$page.data.dateFormat` (set on the layout via the
 * CALENDARR_DATE_FORMAT env var) so the whole app shares one format. Falls back
 * to DEFAULT_DATE_FORMAT when omitted.
 */
export function fmtDateTime(iso: string | null | undefined, fmt: string = DEFAULT_DATE_FORMAT): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	try {
		return format(d, fmt);
	} catch {
		return format(d, DEFAULT_DATE_FORMAT);
	}
}
