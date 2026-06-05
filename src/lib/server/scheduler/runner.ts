import { Cron } from 'croner';
import type { Schedule } from '$lib/types';
import { schedulesRepo } from '$lib/server/db/repositories/schedules';
import { log } from '$lib/server/logger';
import { executeSchedule } from './executor';
import { intervalDue, intervalToDailyCron } from './parse';

const logger = log('scheduler');

const jobs = new Map<number, Cron>();
let initialized = false;

export function initScheduler(): void {
	if (initialized) return;
	initialized = true;
	const enabled = schedulesRepo.listEnabled();
	for (const s of enabled) registerJob(s);
	logger.info(`registered ${jobs.size} job${jobs.size === 1 ? '' : 's'}`);
}

export function registerJob(schedule: Schedule): void {
	unregisterJob(schedule.id);
	if (!schedule.enabled) return;

	let cronExpr: string;
	if (schedule.mode === 'cron') {
		if (!schedule.cronExpression) {
			logger.warn(`schedule ${schedule.id} has mode=cron but no expression — skipping`);
			return;
		}
		cronExpr = schedule.cronExpression;
	} else {
		if (!schedule.intervalTime || !schedule.intervalDays) {
			logger.warn(`schedule ${schedule.id} has mode=interval but missing fields — skipping`);
			return;
		}
		cronExpr = intervalToDailyCron(schedule.intervalTime);
	}

	try {
		const job = new Cron(
			cronExpr,
			{ timezone: schedule.timezone, name: `schedule-${schedule.id}` },
			async () => {
				try {
					if (schedule.mode === 'interval') {
						const latest = schedulesRepo.get(schedule.id);
						if (!latest) return;
						if (!intervalDue(latest.intervalDays!, latest.lastRunAt)) {
							logger.debug(`schedule ${schedule.id} not yet due, skipping tick`);
							return;
						}
					}
					await executeSchedule(schedule, 'schedule');
				} catch (e) {
					logger.error(`schedule ${schedule.id} failed: ${(e as Error).message}`);
				}
			}
		);
		jobs.set(schedule.id, job);
		logger.info(`registered job ${schedule.id} (${schedule.name}) — next: ${job.nextRun()?.toISOString() ?? 'n/a'}`);
	} catch (e) {
		logger.error(`failed to register schedule ${schedule.id}: ${(e as Error).message}`);
	}
}

export function unregisterJob(id: number): void {
	const job = jobs.get(id);
	if (job) {
		job.stop();
		jobs.delete(id);
	}
}

export function reloadJob(scheduleId: number): void {
	const fresh = schedulesRepo.get(scheduleId);
	if (!fresh) {
		unregisterJob(scheduleId);
		return;
	}
	registerJob(fresh);
}

export function nextRun(scheduleId: number): Date | null {
	return jobs.get(scheduleId)?.nextRun() ?? null;
}

export function jobCount(): number {
	return jobs.size;
}
