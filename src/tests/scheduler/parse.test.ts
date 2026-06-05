import { describe, it, expect } from 'vitest';
import { parseShortcut, intervalDue, intervalToDailyCron } from '$lib/server/scheduler/parse';

describe('parseShortcut', () => {
	it('parses "every N days @ HH:MM"', () => {
		const r = parseShortcut('every 3 days @ 09:00');
		expect(r.mode).toBe('interval');
		if (r.mode === 'interval') {
			expect(r.intervalDays).toBe(3);
			expect(r.intervalTime).toBe('09:00');
		}
	});

	it('parses "daily @ HH:MM"', () => {
		const r = parseShortcut('daily @ 18:30');
		expect(r.mode).toBe('interval');
		if (r.mode === 'interval') {
			expect(r.intervalDays).toBe(1);
			expect(r.intervalTime).toBe('18:30');
		}
	});

	it('parses "weekly fri @ HH:MM" to cron', () => {
		const r = parseShortcut('weekly fri @ 09:00');
		expect(r.mode).toBe('cron');
		if (r.mode === 'cron') expect(r.cronExpression).toBe('0 9 * * 5');
	});

	it('parses raw cron expressions', () => {
		const r = parseShortcut('*/15 * * * *');
		expect(r.mode).toBe('cron');
		if (r.mode === 'cron') expect(r.cronExpression).toBe('*/15 * * * *');
	});

	it('rejects garbage', () => {
		expect(() => parseShortcut('nonsense')).toThrow();
	});
});

describe('intervalDue', () => {
	it('is due when last run is null', () => {
		expect(intervalDue(3, null)).toBe(true);
	});

	it('is not due before N days have elapsed', () => {
		const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
		expect(intervalDue(3, oneDayAgo)).toBe(false);
	});

	it('is due once N days have elapsed', () => {
		const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000 - 60_000).toISOString();
		expect(intervalDue(3, threeDaysAgo)).toBe(true);
	});
});

describe('intervalToDailyCron', () => {
	it('builds the daily cron at the given HH:MM', () => {
		expect(intervalToDailyCron('09:00')).toBe('0 9 * * *');
		expect(intervalToDailyCron('18:30')).toBe('30 18 * * *');
	});
});
