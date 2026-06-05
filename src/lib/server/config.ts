import { env } from '$env/dynamic/private';

function readEnv(name: string, fallback: string): string {
	const v = env[name];
	return v && v.length > 0 ? v : fallback;
}

export const CALENDARR_DB_PATH = readEnv('CALENDARR_DB_PATH', './.data/calendarr.db');
export const DEFAULT_TZ = readEnv('TZ', 'Australia/Melbourne');
export const CALENDARR_DATE_FORMAT = readEnv('CALENDARR_DATE_FORMAT', 'dd/MM/yyyy HH:mm');
export const APP_VERSION = '0.1.0';
