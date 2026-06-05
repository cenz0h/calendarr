import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schedulesRepo, type ScheduleInput } from '$lib/server/db/repositories/schedules';
import { reloadJob, nextRun } from '$lib/server/scheduler/runner';
import { parseShortcut, validateCron } from '$lib/server/scheduler/parse';
import { DEFAULT_TZ } from '$lib/server/config';

interface CreateBody {
	name: string;
	serviceIds: number[];
	shortcut?: string;
	cronExpression?: string;
	windowDays?: number;
	timezone?: string;
	enabled?: boolean;
	skipEmpty?: boolean;
}

export const GET: RequestHandler = () => {
	const schedules = schedulesRepo.list();
	const nextRuns: Record<number, string | null> = {};
	for (const s of schedules) {
		const nr = nextRun(s.id);
		nextRuns[s.id] = nr ? nr.toISOString() : null;
	}
	return json({ schedules, nextRuns });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as CreateBody;
	if (!body.name || !Array.isArray(body.serviceIds) || body.serviceIds.length === 0) {
		error(400, 'name and at least one serviceId required');
	}

	let input: ScheduleInput;
	const windowDays = body.windowDays ?? 7;
	const timezone = body.timezone || DEFAULT_TZ;
	if (body.shortcut) {
		const parsed = parseShortcut(body.shortcut);
		input = {
			name: body.name,
			serviceIds: body.serviceIds,
			mode: parsed.mode,
			cronExpression: parsed.mode === 'cron' ? parsed.cronExpression : null,
			intervalDays: parsed.mode === 'interval' ? parsed.intervalDays : null,
			intervalTime: parsed.mode === 'interval' ? parsed.intervalTime : null,
			shortcut: parsed.shortcut,
			windowDays,
			timezone,
			enabled: body.enabled !== false,
			skipEmpty: body.skipEmpty !== false
		};
	} else if (body.cronExpression) {
		validateCron(body.cronExpression);
		input = {
			name: body.name,
			serviceIds: body.serviceIds,
			mode: 'cron',
			cronExpression: body.cronExpression,
			intervalDays: null,
			intervalTime: null,
			shortcut: body.cronExpression,
			windowDays,
			timezone,
			enabled: body.enabled !== false,
			skipEmpty: body.skipEmpty !== false
		};
	} else {
		error(400, 'either shortcut or cronExpression is required');
	}

	const created = schedulesRepo.create(input);
	reloadJob(created.id);
	const nr = nextRun(created.id);
	return json({ schedule: created, nextRun: nr ? nr.toISOString() : null }, { status: 201 });
};
