import type { ArrService, CalendarItem, PostStatus, PostTrigger, Schedule } from '$lib/types';
import { servicesRepo } from '$lib/server/db/repositories/services';
import { schedulesRepo } from '$lib/server/db/repositories/schedules';
import { historyRepo } from '$lib/server/db/repositories/history';
import { makeAdapter } from '$lib/server/arr/registry';
import { buildPayload } from '$lib/server/discord/format';
import { sendWebhook } from '$lib/server/discord/webhook';
import { log } from '$lib/server/logger';

const logger = log('executor');

const locks = new Map<string, Promise<void>>();

export interface ExecuteOptions {
	scheduleId: number | null;
	trigger: PostTrigger;
	serviceIds: number[];
	windowDays: number;
	timezone: string;
	skipEmpty: boolean;
	webhookOverride?: string;
}

export interface RunSummary {
	historyIds: number[];
	results: Array<{
		serviceId: number;
		status: PostStatus;
		httpStatus: number | null;
		itemCount: number;
		error?: string;
	}>;
}

export async function execute(opts: ExecuteOptions): Promise<RunSummary> {
	const lockKey = opts.scheduleId !== null ? `schedule:${opts.scheduleId}` : `manual:${opts.serviceIds.join(',')}`;
	const existing = locks.get(lockKey);
	if (existing) {
		logger.warn(`run already in progress for ${lockKey}, awaiting`);
		await existing;
	}

	let done: () => void;
	const gate = new Promise<void>((resolve) => {
		done = resolve;
	});
	locks.set(lockKey, gate);

	try {
		return await runInner(opts);
	} finally {
		locks.delete(lockKey);
		done!();
	}
}

async function runInner(opts: ExecuteOptions): Promise<RunSummary> {
	const now = new Date();
	const endUtc = new Date(now.getTime() + opts.windowDays * 86_400_000);
	const summary: RunSummary = { historyIds: [], results: [] };

	let aggregateStatus: 'success' | 'partial' | 'error' | 'skipped_empty' = 'success';
	let anySuccess = false;
	let anyError = false;
	let anySkipped = false;

	for (const serviceId of opts.serviceIds) {
		const service = servicesRepo.get(serviceId);
		if (!service) {
			const histId = historyRepo.insert({
				trigger: opts.trigger,
				scheduleId: opts.scheduleId,
				serviceId,
				windowDays: opts.windowDays,
				itemCount: 0,
				status: 'error',
				httpStatus: null,
				errorMessage: 'service not found',
				previewJson: null
			});
			summary.historyIds.push(histId);
			summary.results.push({ serviceId, status: 'error', httpStatus: null, itemCount: 0, error: 'service not found' });
			anyError = true;
			continue;
		}
		if (!service.enabled && opts.trigger === 'schedule') {
			logger.info(`skipping disabled service ${service.name}`);
			continue;
		}

		const r = await runOne(service, now, endUtc, opts);
		summary.historyIds.push(r.historyId);
		summary.results.push(r.result);
		if (r.result.status === 'success') anySuccess = true;
		else if (r.result.status === 'skipped_empty') anySkipped = true;
		else anyError = true;
	}

	if (anyError && anySuccess) aggregateStatus = 'partial';
	else if (anyError) aggregateStatus = 'error';
	else if (anySuccess) aggregateStatus = 'success';
	else if (anySkipped) aggregateStatus = 'skipped_empty';

	if (opts.scheduleId !== null) {
		schedulesRepo.recordRun(opts.scheduleId, aggregateStatus, now.toISOString());
	}

	return summary;
}

async function runOne(
	service: ArrService,
	startUtc: Date,
	endUtc: Date,
	opts: ExecuteOptions
): Promise<{ historyId: number; result: RunSummary['results'][number] }> {
	let items: CalendarItem[] = [];
	try {
		items = await makeAdapter(service).fetchCalendar(startUtc, endUtc);
	} catch (e) {
		const msg = (e as Error).message;
		logger.error(`fetch failed for ${service.name}: ${msg}`);
		const histId = historyRepo.insert({
			trigger: opts.trigger,
			scheduleId: opts.scheduleId,
			serviceId: service.id,
			windowDays: opts.windowDays,
			itemCount: 0,
			status: 'error',
			httpStatus: null,
			errorMessage: msg,
			previewJson: null
		});
		return {
			historyId: histId,
			result: { serviceId: service.id, status: 'error', httpStatus: null, itemCount: 0, error: msg }
		};
	}

	if (items.length === 0 && opts.skipEmpty && opts.trigger === 'schedule') {
		const histId = historyRepo.insert({
			trigger: opts.trigger,
			scheduleId: opts.scheduleId,
			serviceId: service.id,
			windowDays: opts.windowDays,
			itemCount: 0,
			status: 'skipped_empty',
			httpStatus: null,
			errorMessage: null,
			previewJson: null
		});
		return {
			historyId: histId,
			result: { serviceId: service.id, status: 'skipped_empty', httpStatus: null, itemCount: 0 }
		};
	}

	const payload = buildPayload({
		service,
		items,
		windowDays: opts.windowDays,
		timezone: opts.timezone,
		now: startUtc
	});
	const webhookUrl = opts.webhookOverride || service.webhookUrl;
	const send = await sendWebhook(webhookUrl, payload);
	const status: PostStatus = send.ok ? 'success' : 'error';
	const histId = historyRepo.insert({
		trigger: opts.trigger,
		scheduleId: opts.scheduleId,
		serviceId: service.id,
		windowDays: opts.windowDays,
		itemCount: items.length,
		status,
		httpStatus: send.httpStatus,
		errorMessage: send.error ?? null,
		previewJson: JSON.stringify(payload)
	});
	return {
		historyId: histId,
		result: {
			serviceId: service.id,
			status,
			httpStatus: send.httpStatus,
			itemCount: items.length,
			error: send.error
		}
	};
}

export function executeSchedule(schedule: Schedule, trigger: PostTrigger): Promise<RunSummary> {
	return execute({
		scheduleId: schedule.id,
		trigger,
		serviceIds: schedule.serviceIds,
		windowDays: schedule.windowDays,
		timezone: schedule.timezone,
		skipEmpty: schedule.skipEmpty
	});
}
