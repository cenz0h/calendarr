import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CALENDARR_DB_PATH } from '$lib/server/config';
import { log } from '$lib/server/logger';
import { runMigrations } from './migrate';

const logger = log('db');

let _db: Database.Database | null = null;

export function initDb(): Database.Database {
	if (_db) return _db;
	const path = CALENDARR_DB_PATH;
	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	runMigrations(db);
	_db = db;
	logger.info(`initialised at ${path}`);
	warnIfEphemeral(path);
	return db;
}

export function getDb(): Database.Database {
	if (!_db) return initDb();
	return _db;
}

/**
 * If we're in a Linux container (i.e. on Unraid / Docker on Linux) check whether
 * the DB's parent directory is actually a mounted volume. If not, the DB lives
 * on the container's writable layer and will be wiped on every recreate/update.
 * Skip on non-Linux (local dev on Windows/macOS) where /proc/mounts isn't useful.
 */
function warnIfEphemeral(dbPath: string): void {
	if (process.platform !== 'linux') return;
	const parent = dirname(dbPath);
	let mounts: string;
	try {
		mounts = readFileSync('/proc/mounts', 'utf8');
	} catch {
		return;
	}
	const mountPoints = new Set(
		mounts
			.split('\n')
			.map((line) => line.split(' ')[1])
			.filter((p): p is string => Boolean(p))
	);
	if (mountPoints.has(parent)) return;
	logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	logger.warn(`DB directory '${parent}' is NOT a mounted volume.`);
	logger.warn('Your data will be WIPED whenever this container is updated or recreated.');
	logger.warn(`Unraid: Edit container -> Add Path -> Container Path '${parent}', Host Path e.g. /mnt/user/appdata/calendarr`);
	logger.warn(`docker run: add  -v /your/host/path:${parent}`);
	logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
