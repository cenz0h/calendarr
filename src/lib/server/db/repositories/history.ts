import { getDb } from '$lib/server/db';
import type { PostHistoryRow, PostStatus, PostTrigger } from '$lib/types';

interface Row {
	id: number;
	ran_at: string;
	trigger: PostTrigger;
	schedule_id: number | null;
	schedule_name: string | null;
	service_id: number;
	service_name: string | null;
	window_days: number;
	item_count: number;
	status: PostStatus;
	http_status: number | null;
	error_message: string | null;
	preview_json: string | null;
}

function fromRow(r: Row): PostHistoryRow {
	return {
		id: r.id,
		ranAt: r.ran_at,
		trigger: r.trigger,
		scheduleId: r.schedule_id,
		scheduleName: r.schedule_name,
		serviceId: r.service_id,
		serviceName: r.service_name ?? undefined,
		windowDays: r.window_days,
		itemCount: r.item_count,
		status: r.status,
		httpStatus: r.http_status,
		errorMessage: r.error_message,
		previewJson: r.preview_json
	};
}

export interface HistoryInput {
	trigger: PostTrigger;
	scheduleId: number | null;
	serviceId: number;
	windowDays: number;
	itemCount: number;
	status: PostStatus;
	httpStatus: number | null;
	errorMessage: string | null;
	previewJson: string | null;
}

export interface HistoryFilter {
	limit?: number;
	offset?: number;
	serviceId?: number;
	status?: PostStatus;
}

const SELECT_WITH_JOIN = `
SELECT h.id, h.ran_at, h.trigger, h.schedule_id, h.service_id,
       h.window_days, h.item_count, h.status, h.http_status, h.error_message, h.preview_json,
       sc.name AS schedule_name,
       sv.name AS service_name
FROM post_history h
LEFT JOIN schedules sc ON sc.id = h.schedule_id
LEFT JOIN services  sv ON sv.id = h.service_id
`;

export const historyRepo = {
	insert(input: HistoryInput): number {
		const info = getDb()
			.prepare(
				`INSERT INTO post_history
				 (trigger, schedule_id, service_id, window_days, item_count, status, http_status, error_message, preview_json)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				input.trigger,
				input.scheduleId,
				input.serviceId,
				input.windowDays,
				input.itemCount,
				input.status,
				input.httpStatus,
				input.errorMessage,
				input.previewJson
			);
		return Number(info.lastInsertRowid);
	},

	list(filter: HistoryFilter = {}): { rows: PostHistoryRow[]; total: number } {
		const where: string[] = [];
		const params: Record<string, unknown> = {};
		if (filter.serviceId !== undefined) {
			where.push('h.service_id = @serviceId');
			params.serviceId = filter.serviceId;
		}
		if (filter.status !== undefined) {
			where.push('h.status = @status');
			params.status = filter.status;
		}
		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
		const limit = filter.limit ?? 50;
		const offset = filter.offset ?? 0;

		const rows = getDb()
			.prepare<Record<string, unknown>, Row>(
				`${SELECT_WITH_JOIN} ${whereSql} ORDER BY h.ran_at DESC LIMIT @limit OFFSET @offset`
			)
			.all({ ...params, limit, offset })
			.map(fromRow);

		const totalRow = getDb()
			.prepare<Record<string, unknown>, { c: number }>(
				`SELECT COUNT(*) as c FROM post_history h ${whereSql}`
			)
			.get(params);
		return { rows, total: totalRow?.c ?? 0 };
	},

	get(id: number): PostHistoryRow | null {
		const r = getDb()
			.prepare<[number], Row>(`${SELECT_WITH_JOIN} WHERE h.id = ?`)
			.get(id);
		return r ? fromRow(r) : null;
	}
};
