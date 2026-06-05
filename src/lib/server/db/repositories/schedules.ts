import { getDb } from '$lib/server/db';
import type { RunStatus, Schedule, ScheduleMode } from '$lib/types';

interface Row {
	id: number;
	name: string;
	service_ids: string;
	mode: ScheduleMode;
	cron_expression: string | null;
	interval_days: number | null;
	interval_time: string | null;
	shortcut: string | null;
	window_days: number;
	timezone: string;
	enabled: number;
	skip_empty: number;
	last_run_at: string | null;
	last_run_status: RunStatus | null;
	created_at: string;
	updated_at: string;
}

function fromRow(r: Row): Schedule {
	return {
		id: r.id,
		name: r.name,
		serviceIds: JSON.parse(r.service_ids) as number[],
		mode: r.mode,
		cronExpression: r.cron_expression,
		intervalDays: r.interval_days,
		intervalTime: r.interval_time,
		shortcut: r.shortcut,
		windowDays: r.window_days,
		timezone: r.timezone,
		enabled: r.enabled === 1,
		skipEmpty: r.skip_empty === 1,
		lastRunAt: r.last_run_at,
		lastRunStatus: r.last_run_status,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

export interface ScheduleInput {
	name: string;
	serviceIds: number[];
	mode: ScheduleMode;
	cronExpression?: string | null;
	intervalDays?: number | null;
	intervalTime?: string | null;
	shortcut?: string | null;
	windowDays: number;
	timezone: string;
	enabled?: boolean;
	skipEmpty?: boolean;
}

export const schedulesRepo = {
	list(): Schedule[] {
		return getDb()
			.prepare<[], Row>('SELECT * FROM schedules ORDER BY id')
			.all()
			.map(fromRow);
	},

	listEnabled(): Schedule[] {
		return getDb()
			.prepare<[], Row>('SELECT * FROM schedules WHERE enabled = 1 ORDER BY id')
			.all()
			.map(fromRow);
	},

	get(id: number): Schedule | null {
		const r = getDb().prepare<[number], Row>('SELECT * FROM schedules WHERE id = ?').get(id);
		return r ? fromRow(r) : null;
	},

	create(input: ScheduleInput): Schedule {
		const info = getDb()
			.prepare(
				`INSERT INTO schedules
				 (name, service_ids, mode, cron_expression, interval_days, interval_time,
				  shortcut, window_days, timezone, enabled, skip_empty)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				input.name,
				JSON.stringify(input.serviceIds),
				input.mode,
				input.cronExpression ?? null,
				input.intervalDays ?? null,
				input.intervalTime ?? null,
				input.shortcut ?? null,
				input.windowDays,
				input.timezone,
				input.enabled === false ? 0 : 1,
				input.skipEmpty === false ? 0 : 1
			);
		return this.get(Number(info.lastInsertRowid))!;
	},

	update(id: number, patch: Partial<ScheduleInput>): Schedule | null {
		const existing = this.get(id);
		if (!existing) return null;
		getDb()
			.prepare(
				`UPDATE schedules SET
					name            = COALESCE(@name, name),
					service_ids     = COALESCE(@serviceIds, service_ids),
					mode            = COALESCE(@mode, mode),
					cron_expression = COALESCE(@cronExpression, cron_expression),
					interval_days   = COALESCE(@intervalDays, interval_days),
					interval_time   = COALESCE(@intervalTime, interval_time),
					shortcut        = COALESCE(@shortcut, shortcut),
					window_days     = COALESCE(@windowDays, window_days),
					timezone        = COALESCE(@timezone, timezone),
					enabled         = COALESCE(@enabled, enabled),
					skip_empty      = COALESCE(@skipEmpty, skip_empty),
					updated_at      = datetime('now')
				WHERE id = @id`
			)
			.run({
				id,
				name: patch.name ?? null,
				serviceIds: patch.serviceIds ? JSON.stringify(patch.serviceIds) : null,
				mode: patch.mode ?? null,
				cronExpression: patch.cronExpression ?? null,
				intervalDays: patch.intervalDays ?? null,
				intervalTime: patch.intervalTime ?? null,
				shortcut: patch.shortcut ?? null,
				windowDays: patch.windowDays ?? null,
				timezone: patch.timezone ?? null,
				enabled: patch.enabled === undefined ? null : patch.enabled ? 1 : 0,
				skipEmpty: patch.skipEmpty === undefined ? null : patch.skipEmpty ? 1 : 0
			});
		return this.get(id);
	},

	remove(id: number): boolean {
		const r = getDb().prepare('DELETE FROM schedules WHERE id = ?').run(id);
		return r.changes > 0;
	},

	recordRun(id: number, status: RunStatus, ranAt: string): void {
		getDb()
			.prepare(
				`UPDATE schedules SET last_run_at = ?, last_run_status = ?, updated_at = datetime('now') WHERE id = ?`
			)
			.run(ranAt, status, id);
	}
};
