import { Cron } from 'croner';

export type ParsedShortcut =
	| { mode: 'cron'; cronExpression: string; shortcut: string }
	| {
			mode: 'interval';
			intervalDays: number;
			intervalTime: string;
			shortcut: string;
	  };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Accepts:
 *   "every N days @ HH:MM"   -> interval
 *   "daily @ HH:MM"          -> interval (1 day)
 *   "weekly <dow> @ HH:MM"   -> cron (dow = sun/mon/tue/wed/thu/fri/sat)
 *   "hourly"                 -> cron "0 * * * *"
 *   "cron: <5-field expr>"   -> cron
 *   Otherwise: parsed as a raw 5-field cron expression.
 */
export function parseShortcut(raw: string): ParsedShortcut {
	const s = raw.trim().toLowerCase();

	let m = /^every\s+(\d+)\s+days?\s*(?:@\s*(\d{1,2}:\d{2}))?$/.exec(s);
	if (m) {
		const days = parseInt(m[1], 10);
		if (days < 1) throw new Error('interval must be at least 1 day');
		const time = m[2] ?? '09:00';
		assertHHMM(time);
		return {
			mode: 'interval',
			intervalDays: days,
			intervalTime: time,
			shortcut: `every ${days} days @ ${time}`
		};
	}

	m = /^daily\s*(?:@\s*(\d{1,2}:\d{2}))?$/.exec(s);
	if (m) {
		const time = m[1] ?? '09:00';
		assertHHMM(time);
		return {
			mode: 'interval',
			intervalDays: 1,
			intervalTime: time,
			shortcut: `daily @ ${time}`
		};
	}

	m = /^weekly\s+(sun|mon|tue|wed|thu|fri|sat)\s*(?:@\s*(\d{1,2}:\d{2}))?$/.exec(s);
	if (m) {
		const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[1]);
		const time = m[2] ?? '09:00';
		assertHHMM(time);
		const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));
		const expr = `${mm} ${hh} * * ${dow}`;
		validateCron(expr);
		return { mode: 'cron', cronExpression: expr, shortcut: `weekly ${m[1]} @ ${time}` };
	}

	if (s === 'hourly') {
		return { mode: 'cron', cronExpression: '0 * * * *', shortcut: 'hourly' };
	}

	const rawExpr = s.startsWith('cron:') ? s.slice(5).trim() : s;
	validateCron(rawExpr);
	return { mode: 'cron', cronExpression: rawExpr, shortcut: rawExpr };
}

function assertHHMM(t: string): void {
	if (!HHMM.test(t)) throw new Error(`invalid time "${t}", expected HH:MM`);
}

export function validateCron(expr: string): void {
	try {
		new Cron(expr).nextRun();
	} catch (e) {
		throw new Error(`invalid cron "${expr}": ${(e as Error).message}`);
	}
}

/** Convert an interval schedule's time to the daily cron that fires the gate check. */
export function intervalToDailyCron(intervalTime: string): string {
	assertHHMM(intervalTime);
	const [hh, mm] = intervalTime.split(':').map((n) => parseInt(n, 10));
	return `${mm} ${hh} * * *`;
}

/** True if a strict every-N-days interval is due (last_run_at + N*24h <= now). */
export function intervalDue(
	intervalDays: number,
	lastRunAt: string | null,
	now: Date = new Date()
): boolean {
	if (!lastRunAt) return true;
	const lastMs = Date.parse(lastRunAt);
	if (!Number.isFinite(lastMs)) return true;
	return now.getTime() - lastMs >= intervalDays * 86_400_000 - 60_000; // 1-min slack for jitter
}
