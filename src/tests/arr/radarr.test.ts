import { describe, it, expect } from 'vitest';
import { mapMovie } from '$lib/server/arr/radarr';
import fixtures from '../fixtures/radarr-calendar.json';

const start = new Date('2026-06-05T00:00:00Z');
const end = new Date('2026-06-12T00:00:00Z');

describe('RadarrAdapter mapping', () => {
	it('prefers digital over cinema when both fall in window', () => {
		const m = mapMovie(fixtures[0], start, end);
		expect(m).not.toBeNull();
		expect(m!.releaseType).toBe('digital');
		expect(m!.whenUtc).toBe('2026-06-10T00:00:00.000Z');
	});

	it('falls back to cinema when only cinema is in window', () => {
		const m = mapMovie(fixtures[1], start, end);
		expect(m).not.toBeNull();
		expect(m!.releaseType).toBe('cinema');
	});

	it('prefers physical over cinema when physical is in window and cinema is not', () => {
		const m = mapMovie(fixtures[2], start, end);
		expect(m).not.toBeNull();
		expect(m!.releaseType).toBe('physical');
		expect(m!.hasFile).toBe(true);
	});

	it('returns null when no date falls in the window', () => {
		const m = mapMovie(fixtures[3], start, end);
		expect(m).toBeNull();
	});
});
