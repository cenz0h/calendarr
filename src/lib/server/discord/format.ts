import { formatInTimeZone } from 'date-fns-tz';
import type { ArrService, CalendarItem, DiscordEmbed, DiscordWebhookPayload } from '$lib/types';
import { colorForDayKey, colorForService } from './colors';

const DESCRIPTION_LIMIT = 4096;
const MAX_DAY_EMBEDS = 10;

export interface FormatOptions {
	service: ArrService;
	items: CalendarItem[];
	windowDays: number;
	timezone: string;
	now?: Date;
}

export function buildPayload(opts: FormatOptions): DiscordWebhookPayload {
	const { service, items, windowDays, timezone } = opts;
	const now = opts.now ?? new Date();
	const icon = service.kind === 'sonarr' ? '📺' : '🎬';
	const label = service.kind === 'sonarr' ? 'TV' : 'Movies';
	const content =
		`## ${icon} ${label} — next ${windowDays} day${windowDays === 1 ? '' : 's'}\n` +
		`-# ${capitalize(service.kind)} · ${service.name}`;

	if (items.length === 0) {
		return {
			username: 'Calendarr',
			content,
			embeds: [
				{
					description: 'Nothing scheduled in this window.',
					color: colorForService(service.kind),
					timestamp: now.toISOString()
				}
			]
		};
	}

	const groups = groupByDay(items, timezone);
	const overflow = groups.length > MAX_DAY_EMBEDS;
	const visible = overflow ? groups.slice(0, MAX_DAY_EMBEDS) : groups;
	const overflowCount = overflow ? groups.length - MAX_DAY_EMBEDS : 0;

	const embeds: DiscordEmbed[] = visible.map((g, i) => {
		const isLast = i === visible.length - 1;
		const lines = g.items.map((it) => formatItemLine(it, timezone));
		let description = lines.join('\n');
		if (isLast && overflow) {
			description += `\n\n*…and ${overflowCount} more day${overflowCount === 1 ? '' : 's'} in the window*`;
		}
		description = truncateDescription(description, DESCRIPTION_LIMIT);
		return {
			title: g.dayLabel,
			description,
			color: colorForDayKey(g.dayKey),
			timestamp: isLast ? now.toISOString() : undefined
		};
	});

	return { username: 'Calendarr', content, embeds };
}

interface DayGroup {
	dayLabel: string;
	dayKey: string;
	items: CalendarItem[];
}

export function groupByDay(items: CalendarItem[], timezone: string): DayGroup[] {
	const map = new Map<string, DayGroup>();
	const sorted = [...items].sort((a, b) => Date.parse(a.whenUtc) - Date.parse(b.whenUtc));
	for (const it of sorted) {
		const d = new Date(it.whenUtc);
		const key = formatInTimeZone(d, timezone, 'yyyy-MM-dd');
		const label = formatInTimeZone(d, timezone, 'EEEE d MMMM');
		let group = map.get(key);
		if (!group) {
			group = { dayKey: key, dayLabel: label, items: [] };
			map.set(key, group);
		}
		group.items.push(it);
	}
	return [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

export function formatItemLine(item: CalendarItem, timezone: string): string {
	const time = formatInTimeZone(new Date(item.whenUtc), timezone, 'HH:mm');
	const downloaded = item.hasFile ? ' *(downloaded)*' : '';
	if (item.kind === 'sonarr') {
		const ep = item.episodeCode ? ` — ${item.episodeCode}` : '';
		const epTitle = item.episodeTitle ? ` — ${item.episodeTitle}` : '';
		return `• **${item.title}**${ep}${epTitle}  ·  ${time}${downloaded}`;
	}
	const release = item.releaseType ? `  ·  ${item.releaseType} release` : '';
	return `• **${item.title}**${release}${downloaded}`;
}

function truncateDescription(value: string, max: number): string {
	if (value.length <= max) return value;
	const lines = value.split('\n');
	const kept: string[] = [];
	let chars = 0;
	const suffixReserve = 48;
	for (const line of lines) {
		if (chars + line.length + 1 > max - suffixReserve) break;
		kept.push(line);
		chars += line.length + 1;
	}
	const dropped = lines.length - kept.length;
	if (dropped > 0) kept.push(`*…and ${dropped} more*`);
	return kept.join('\n');
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
