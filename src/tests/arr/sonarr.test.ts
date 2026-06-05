import { describe, it, expect } from 'vitest';
import { mapEpisode } from '$lib/server/arr/sonarr';
import fixtures from '../fixtures/sonarr-calendar.json';

describe('SonarrAdapter mapping', () => {
	it('maps each episode to a CalendarItem', () => {
		const items = fixtures.map(mapEpisode);
		expect(items).toHaveLength(3);
	});

	it('formats episodeCode as SxxExx', () => {
		const item = mapEpisode(fixtures[0]);
		expect(item.episodeCode).toBe('S03E01');
	});

	it('preserves the series title and episode title', () => {
		const item = mapEpisode(fixtures[2]);
		expect(item.title).toBe('House of the Dragon');
		expect(item.episodeTitle).toBe('A Son for a Son');
	});

	it('passes through hasFile', () => {
		const items = fixtures.map(mapEpisode);
		expect(items[0].hasFile).toBe(false);
		expect(items[1].hasFile).toBe(true);
	});

	it('uses airDateUtc as whenUtc', () => {
		const item = mapEpisode(fixtures[0]);
		expect(item.whenUtc).toBe('2026-06-06T09:00:00Z');
	});
});
