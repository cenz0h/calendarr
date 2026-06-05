CREATE TABLE IF NOT EXISTS services (
	id            INTEGER PRIMARY KEY AUTOINCREMENT,
	name          TEXT    NOT NULL,
	kind          TEXT    NOT NULL CHECK (kind IN ('sonarr','radarr')),
	base_url      TEXT    NOT NULL,
	api_key       TEXT    NOT NULL,
	webhook_url   TEXT    NOT NULL,
	enabled       INTEGER NOT NULL DEFAULT 1,
	created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
	updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedules (
	id                  INTEGER PRIMARY KEY AUTOINCREMENT,
	name                TEXT    NOT NULL,
	service_ids         TEXT    NOT NULL,
	mode                TEXT    NOT NULL CHECK (mode IN ('cron','interval')),
	cron_expression     TEXT,
	interval_days       INTEGER,
	interval_time       TEXT,
	shortcut            TEXT,
	window_days         INTEGER NOT NULL DEFAULT 7,
	timezone            TEXT    NOT NULL,
	enabled             INTEGER NOT NULL DEFAULT 1,
	skip_empty          INTEGER NOT NULL DEFAULT 1,
	last_run_at         TEXT,
	last_run_status     TEXT,
	created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
	updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_history (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	ran_at          TEXT    NOT NULL DEFAULT (datetime('now')),
	trigger         TEXT    NOT NULL CHECK (trigger IN ('schedule','manual')),
	schedule_id     INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
	service_id      INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
	window_days     INTEGER NOT NULL,
	item_count      INTEGER NOT NULL,
	status          TEXT    NOT NULL CHECK (status IN ('success','skipped_empty','error')),
	http_status     INTEGER,
	error_message   TEXT,
	preview_json    TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_ran_at  ON post_history(ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_service ON post_history(service_id);
