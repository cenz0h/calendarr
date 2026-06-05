import type { DiscordWebhookPayload } from '$lib/types';
import { log } from '$lib/server/logger';

const logger = log('discord');

export interface SendResult {
	ok: boolean;
	httpStatus: number;
	error?: string;
}

export async function sendWebhook(url: string, payload: DiscordWebhookPayload): Promise<SendResult> {
	try {
		const res = await postOnce(url, payload);
		if (res.status === 429) {
			const retryAfterMs = await parseRetryAfter(res);
			logger.warn(`429 from Discord, retrying once after ${retryAfterMs}ms`);
			await sleep(retryAfterMs);
			const res2 = await postOnce(url, payload);
			return finalise(res2);
		}
		return finalise(res);
	} catch (e) {
		const msg = (e as Error).message;
		logger.error(`network error: ${msg}`);
		return { ok: false, httpStatus: 0, error: msg };
	}
}

async function postOnce(url: string, payload: DiscordWebhookPayload): Promise<Response> {
	return fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10_000)
	});
}

async function finalise(res: Response): Promise<SendResult> {
	if (res.ok) return { ok: true, httpStatus: res.status };
	const text = await res.text().catch(() => '');
	return { ok: false, httpStatus: res.status, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
}

async function parseRetryAfter(res: Response): Promise<number> {
	const header = res.headers.get('retry-after');
	if (header) {
		const seconds = parseFloat(header);
		if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	}
	try {
		const body = (await res.clone().json()) as { retry_after?: number };
		if (typeof body.retry_after === 'number') return Math.max(0, body.retry_after * 1000);
	} catch {
		/* ignore */
	}
	return 1000;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
