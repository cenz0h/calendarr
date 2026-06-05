import type Database from 'better-sqlite3';
import { log } from '$lib/server/logger';

const logger = log('db.migrate');

// Vite inlines SQL files as raw strings at build time. Keys come back like
// '/src/lib/server/db/migrations/0001_init.sql'.
const sqlFiles = import.meta.glob('./migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export function runMigrations(db: Database.Database): void {
	db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
		version INTEGER PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (datetime('now'))
	);`);

	const applied = new Set(
		db
			.prepare<[], { version: number }>('SELECT version FROM schema_version')
			.all()
			.map((r) => r.version)
	);

	const entries = Object.entries(sqlFiles)
		.map(([path, sql]) => {
			const file = path.split('/').pop() ?? path;
			const version = parseInt(file.split('_')[0], 10);
			return { path, file, version, sql };
		})
		.filter((e) => Number.isFinite(e.version))
		.sort((a, b) => a.version - b.version);

	for (const { file, version, sql } of entries) {
		if (applied.has(version)) continue;
		const tx = db.transaction(() => {
			db.exec(sql);
			db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
		});
		tx();
		logger.info(`applied migration ${file}`);
	}
}
