import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schedulesRepo, type ScheduleInput } from '$lib/server/db/repositories/schedules';
import { parseShortcut, validateCron } from '$lib/server/scheduler/parse';
import { reloadJob, nextRun, unregisterJob } from '$lib/server/scheduler/runner';

function parseId(idStr: string): number {
	const id = parseInt(idStr, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');
	return id;
}

export const GET: RequestHandler = ({ params }) => {
	const id = parseId(params.id!);
	const s = schedulesRepo.get(id);
	if (!s) error(404, 'not found');
	const nr = nextRun(id);
	return json({ schedule: s, nextRun: nr ? nr.toISOString() : null });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params.id!);
	const body = (await request.json()) as Partial<ScheduleInput> & { shortcut?: string };

	const patch: Partial<ScheduleInput> = { ...body };
	if (body.shortcut) {
		const parsed = parseShortcut(body.shortcut);
		patch.mode = parsed.mode;
		patch.cronExpression = parsed.mode === 'cron' ? parsed.cronExpression : null;
		patch.intervalDays = parsed.mode === 'interval' ? parsed.intervalDays : null;
		patch.intervalTime = parsed.mode === 'interval' ? parsed.intervalTime : null;
		patch.shortcut = parsed.shortcut;
	} else if (body.cronExpression) {
		validateCron(body.cronExpression);
	}

	const updated = schedulesRepo.update(id, patch);
	if (!updated) error(404, 'not found');
	reloadJob(id);
	const nr = nextRun(id);
	return json({ schedule: updated, nextRun: nr ? nr.toISOString() : null });
};

export const DELETE: RequestHandler = ({ params }) => {
	const id = parseId(params.id!);
	const ok = schedulesRepo.remove(id);
	if (!ok) error(404, 'not found');
	unregisterJob(id);
	return json({ ok: true });
};
