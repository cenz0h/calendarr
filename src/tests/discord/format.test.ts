import { describe, it, expect } from 'vitest';
import { buildPayload, groupByDay, formatItemLine } from '$lib/server/discord/format';
import { colorForDayKey } from '$lib/server/discord/colors';
import type { ArrService, CalendarItem } from '$lib/types';

const tz = 'Australia/Melbourne';

const service: ArrService = {
	id: 1,
	name: 'Test Sonarr',
	kind: 'sonarr',
	baseUrl: 'http://localhost:8989',
	apiKey: 'k',
	webhookUrl: 'https://discord.example/webhooks/1/abc',
	enabled: true,
	createdAt: '',
	updatedAt: ''
};

function ep(when: string, title: string, code = 'S01E01', hasFile = false): CalendarItem {
	return { kind: 'sonarr', whenUtc: when, title, episodeCode: code, episodeTitle: 'ep', hasFile };
}

describe('groupByDay', () => {
	it('groups items by local-date in the given timezone', () => {
		// 23:30 UTC on the 5th is 09:30 AEST on the 6th
		const items = [
			ep('2026-06-05T23:30:00Z', 'A'),
			ep('2026-06-06T00:30:00Z', 'B'),
			ep('2026-06-06T14:00:00Z', 'C')
		];
		const groups = groupByDay(items, tz);
		expect(groups).toHaveLength(2);
		expect(groups[0].items).toHaveLength(2);
		expect(groups[1].items).toHaveLength(1);
	});

	it('sorts items within a day chronologically', () => {
		const items = [
			ep('2026-06-06T20:00:00Z', 'Late'),
			ep('2026-06-06T08:00:00Z', 'Early')
		];
		const groups = groupByDay(items, tz);
		expect(groups[0].items[0].title).toBe('Early');
	});

	it('produces a full weekday day label', () => {
		const groups = groupByDay([ep('2026-06-05T22:00:00Z', 'X')], tz);
		// 2026-06-05 22:00 UTC = 2026-06-06 08:00 AEST (Saturday)
		expect(groups[0].dayLabel).toMatch(/Saturday/);
	});
});

describe('colorForDayKey', () => {
	it('assigns the same color to the same weekday', () => {
		// 2026-06-05 is a Friday, 2026-06-12 is also a Friday
		expect(colorForDayKey('2026-06-05')).toBe(colorForDayKey('2026-06-12'));
	});

	it('assigns different colors to different weekdays', () => {
		// Friday vs Saturday
		expect(colorForDayKey('2026-06-05')).not.toBe(colorForDayKey('2026-06-06'));
	});
});

describe('formatItemLine', () => {
	it('marks downloaded episodes', () => {
		const line = formatItemLine(ep('2026-06-06T09:00:00Z', 'A', 'S01E02', true), tz);
		expect(line).toContain('*(downloaded)*');
		expect(line).toContain('S01E02');
	});

	it('formats movies with release type', () => {
		const movie: CalendarItem = {
			kind: 'radarr',
			whenUtc: '2026-06-08T00:00:00Z',
			title: 'Movie',
			releaseType: 'digital',
			hasFile: false
		};
		expect(formatItemLine(movie, tz)).toContain('digital release');
	});
});

describe('buildPayload', () => {
	const now = new Date('2026-06-05T22:00:00Z');

	it('puts the post heading in payload.content as a markdown heading', () => {
		const p = buildPayload({ service, items: [], windowDays: 7, timezone: tz, now });
		expect(p.content).toMatch(/^## /);
		expect(p.content).toMatch(/TV — next 7 days/);
		expect(p.content).toMatch(/Sonarr/);
	});

	it('returns a single "nothing scheduled" embed when no items', () => {
		const p = buildPayload({ service, items: [], windowDays: 7, timezone: tz, now });
		expect(p.embeds).toHaveLength(1);
		expect(p.embeds![0].description).toMatch(/nothing scheduled/i);
		expect(p.embeds![0].fields).toBeUndefined();
	});

	it('builds one embed per day with day-colored embeds', () => {
		const items = [
			ep('2026-06-06T09:00:00Z', 'A'),
			ep('2026-06-06T10:00:00Z', 'B'),
			ep('2026-06-08T11:00:00Z', 'C')
		];
		const p = buildPayload({ service, items, windowDays: 7, timezone: tz, now });
		expect(p.embeds).toHaveLength(2);
		expect(p.embeds![0].title).toMatch(/Saturday/);
		expect(p.embeds![1].title).toMatch(/Monday/);
		// Different weekdays should get different colors
		expect(p.embeds![0].color).not.toBe(p.embeds![1].color);
	});

	it('lists all items for a day in its embed description', () => {
		const items = [
			ep('2026-06-06T09:00:00Z', 'First'),
			ep('2026-06-06T10:00:00Z', 'Second')
		];
		const p = buildPayload({ service, items, windowDays: 7, timezone: tz, now });
		expect(p.embeds![0].description).toContain('First');
		expect(p.embeds![0].description).toContain('Second');
	});

	it('only stamps the timestamp on the final embed', () => {
		const items = [
			ep('2026-06-06T09:00:00Z', 'A'),
			ep('2026-06-08T11:00:00Z', 'B'),
			ep('2026-06-10T11:00:00Z', 'C')
		];
		const p = buildPayload({ service, items, windowDays: 7, timezone: tz, now });
		expect(p.embeds![0].timestamp).toBeUndefined();
		expect(p.embeds![1].timestamp).toBeUndefined();
		expect(p.embeds![2].timestamp).toBe(now.toISOString());
	});

	it('caps at 10 embeds and adds an overflow tail', () => {
		const items: CalendarItem[] = [];
		for (let d = 1; d <= 14; d++) {
			const day = `2026-06-${String(d).padStart(2, '0')}T09:00:00Z`;
			items.push(ep(day, `Day ${d}`));
		}
		const p = buildPayload({ service, items, windowDays: 14, timezone: tz, now });
		expect(p.embeds).toHaveLength(10);
		const lastDescription = p.embeds![9].description!;
		expect(lastDescription).toMatch(/4 more days/);
	});

	it('truncates very long descriptions', () => {
		const items: CalendarItem[] = [];
		for (let i = 0; i < 200; i++) {
			items.push(
				ep('2026-06-06T09:00:00Z', `Episode ${i} with a long-enough title to bloat the description`, `S01E${i + 1}`)
			);
		}
		const p = buildPayload({ service, items, windowDays: 7, timezone: tz, now });
		const desc = p.embeds![0].description!;
		expect(desc.length).toBeLessThanOrEqual(4096);
		expect(desc).toContain('…and');
	});
});
