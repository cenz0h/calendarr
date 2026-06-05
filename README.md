# Calendarr

Self-hosted Docker web app that publishes the Sonarr and Radarr calendars to Discord on a schedule (or on demand).

- Multiple Sonarr/Radarr instances supported.
- Per-service Discord webhook (point both at the same channel by reusing the URL).
- Default 7-day window grouped by day, configurable per schedule.
- Strict "every N days @ HH:MM" intervals, plus raw cron.
- Manual **Post now** with preview from the web UI.
- Persistent history of every post (debuggable raw payloads).
- LAN-only, no auth — designed to sit behind your existing reverse proxy.

## Stack

SvelteKit (Node adapter) + TypeScript, SQLite (`better-sqlite3`), `croner` for scheduling, `date-fns-tz` for timezone-aware day grouping. Mirrors the FairWeather repo conventions.

## Local dev

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>. The SQLite DB is created at `./.data/calendarr.db`.

```bash
npm test          # vitest run
npm run check     # svelte-check
npm run build     # production build
npm start         # run the built server (node build)
```

## Docker

```bash
docker compose build
docker compose up -d
docker compose logs -f calendarr
```

Then open <http://localhost:3000>. The SQLite DB persists at `./config/calendarr.db` (or whatever you mount to `/config`).

On Unraid, change the volume to `/mnt/user/appdata/calendarr:/config` in `docker-compose.yml`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `HOST` | `0.0.0.0` | HTTP bind address |
| `TZ` | `Australia/Melbourne` | Default timezone for new schedules and day-grouping |
| `CALENDARR_DATE_FORMAT` | `dd/MM/yyyy HH:mm` | Date format used in the web UI ([date-fns tokens](https://date-fns.org/docs/format)). e.g. `MM/dd/yyyy hh:mm a` for US, `yyyy-MM-dd HH:mm` for ISO. |
| `CALENDARR_DB_PATH` | `/config/calendarr.db` (container) / `./.data/calendarr.db` (dev) | SQLite file location |
| `PUID` | `99` | User ID the container runs as. Default matches Unraid's `nobody`. On other Linux hosts set to your `id -u` (often 1000). |
| `PGID` | `100` | Group ID the container runs as. Default matches Unraid's `users`. On other Linux hosts set to your `id -g` (often 1000). |

## How to use

1. **Add services** (`/services`): one row per Sonarr or Radarr instance — name, base URL (e.g. `http://192.168.x.y:8989`), API key (Settings → General → Security in Sonarr/Radarr), Discord webhook URL.
2. **Test** the connection — should show the *arr version and latency.
3. **Manual post** (`/post`): pick services, set window (default 7 days), Preview, Send. Useful for the first run.
4. **Schedules** (`/schedules`): add one or more schedules. Each schedule fans out to its selected services.
   - Shortcuts: `every 3 days @ 09:00`, `daily @ 18:00`, `weekly fri @ 09:00`, `hourly`.
   - Or paste a 5-field cron expression for full control.
5. **History** (`/history`): full audit log including the exact payload sent. Click a row to expand.

## Discord output

One embed per service (so each service can target a different channel via its own webhook URL).
Items grouped by local-date (schedule's timezone). Days with no items are dropped. Sonarr embeds are blue, Radarr embeds are yellow.

Empty windows: scheduled runs are **skipped** (with a `skipped_empty` history entry) unless you turn off **Skip when window has no items**. Manual posts always send a "Nothing scheduled" embed so you get feedback.

## Adding more *arr tools later

Drop a new adapter in `src/lib/server/arr/<kind>.ts` implementing `ArrAdapter`, register it in `registry.ts`, and extend the `kind` CHECK constraint in a new migration. Sonarr/Radarr are wired the same way — Lidarr, Readarr etc. just plug in.

## Security note

API keys are stored plaintext in the SQLite DB. Calendarr has no authentication — keep it on your LAN, behind your reverse proxy's access controls. Don't expose it to the internet.

## License

MIT.
