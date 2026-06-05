<script lang="ts">
	import type { PageData } from './$types';
	import type { Schedule } from '$lib/types';
	import { invalidateAll } from '$app/navigation';
	import { fmtDateTime } from '$lib/format-date';

	let { data }: { data: PageData } = $props();

	let editing = $state<Schedule | null>(null);
	let creating = $state(false);
	let saveError = $state<string | null>(null);

	type Mode = 'shortcut' | 'cron';
	let form = $state({
		name: '',
		mode: 'shortcut' as Mode,
		shortcut: 'every 3 days @ 09:00',
		cronExpression: '0 9 * * *',
		serviceIds: [] as number[],
		windowDays: 7,
		timezone: data.defaultTz,
		enabled: true,
		skipEmpty: true
	});

	function startCreate() {
		creating = true;
		editing = null;
		saveError = null;
		form = {
			name: '',
			mode: 'shortcut',
			shortcut: 'every 3 days @ 09:00',
			cronExpression: '0 9 * * *',
			serviceIds: data.services.length ? [data.services[0].id] : [],
			windowDays: 7,
			timezone: data.defaultTz,
			enabled: true,
			skipEmpty: true
		};
	}

	function startEdit(s: Schedule) {
		creating = false;
		editing = s;
		saveError = null;
		form = {
			name: s.name,
			mode: s.mode === 'cron' && !s.shortcut?.match(/^(every|daily|weekly|hourly)/) ? 'cron' : 'shortcut',
			shortcut: s.shortcut ?? '',
			cronExpression: s.cronExpression ?? '0 9 * * *',
			serviceIds: s.serviceIds,
			windowDays: s.windowDays,
			timezone: s.timezone,
			enabled: s.enabled,
			skipEmpty: s.skipEmpty
		};
	}

	function cancel() {
		creating = false;
		editing = null;
		saveError = null;
	}

	function toggleService(id: number) {
		if (form.serviceIds.includes(id)) {
			form.serviceIds = form.serviceIds.filter((x) => x !== id);
		} else {
			form.serviceIds = [...form.serviceIds, id];
		}
	}

	async function save() {
		saveError = null;
		if (form.serviceIds.length === 0) {
			saveError = 'Pick at least one service';
			return;
		}
		const body: Record<string, unknown> = {
			name: form.name,
			serviceIds: form.serviceIds,
			windowDays: form.windowDays,
			timezone: form.timezone,
			enabled: form.enabled,
			skipEmpty: form.skipEmpty
		};
		if (form.mode === 'shortcut') {
			body.shortcut = form.shortcut;
		} else {
			body.cronExpression = form.cronExpression;
		}
		const url = editing ? `/api/schedules/${editing.id}` : '/api/schedules';
		const method = editing ? 'PATCH' : 'POST';
		const res = await fetch(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			saveError = await res.text();
			return;
		}
		await invalidateAll();
		cancel();
	}

	async function remove(id: number) {
		if (!confirm('Delete this schedule?')) return;
		const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
	}

	async function runNow(id: number) {
		const res = await fetch(`/api/schedules/${id}/run`, { method: 'POST' });
		if (res.ok) {
			await invalidateAll();
			alert('Schedule run triggered. See /history.');
		} else {
			alert('Failed: ' + (await res.text()));
		}
	}

	function fmtDate(iso: string | null): string {
		return fmtDateTime(iso, data.dateFormat);
	}

	function serviceNames(ids: number[]): string {
		return ids
			.map((id) => data.services.find((s) => s.id === id)?.name ?? `#${id}`)
			.join(', ');
	}
</script>

<h1>Schedules</h1>

<section class="panel">
	<div style="display: flex; justify-content: space-between; align-items: center;">
		<h2>Configured schedules</h2>
		<button class="btn primary" onclick={startCreate} disabled={data.services.length === 0}>
			+ Add schedule
		</button>
	</div>

	{#if data.services.length === 0}
		<p class="muted">Add a service first on the <a href="/services">Services</a> page.</p>
	{:else if data.schedules.length === 0}
		<p class="muted">No schedules yet.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Services</th>
					<th>When</th>
					<th>Window</th>
					<th>Next run</th>
					<th>Enabled</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.schedules as s (s.id)}
					<tr>
						<td>{s.name}</td>
						<td class="muted">{serviceNames(s.serviceIds)}</td>
						<td><code>{s.shortcut ?? s.cronExpression}</code></td>
						<td>{s.windowDays}d</td>
						<td>{fmtDate(data.nextRuns[s.id])}</td>
						<td>
							<span class="pill {s.enabled ? 'ok' : 'bad'}">{s.enabled ? 'yes' : 'no'}</span>
						</td>
						<td style="white-space: nowrap;">
							<button class="btn" onclick={() => runNow(s.id)}>Run</button>
							<button class="btn" onclick={() => startEdit(s)}>Edit</button>
							<button class="btn danger" onclick={() => remove(s.id)}>Delete</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

{#if creating || editing}
	<section class="panel" style="margin-top: 1rem;">
		<h2>{editing ? `Edit ${editing.name}` : 'Add schedule'}</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<div class="grid">
				<label class="full">
					Name
					<input bind:value={form.name} required />
				</label>

				<div class="full">
					Services
					<div class="services-grid">
						{#each data.services as s (s.id)}
							<label class="checkbox">
								<input
									type="checkbox"
									checked={form.serviceIds.includes(s.id)}
									onchange={() => toggleService(s.id)}
								/>
								{s.name} <span class="muted">({s.kind})</span>
							</label>
						{/each}
					</div>
				</div>

				<div class="full">
					Mode
					<div style="display: flex; gap: 0.5rem; margin-top: 0.3rem;">
						<label class="radio">
							<input type="radio" value="shortcut" bind:group={form.mode} />
							Shortcut
						</label>
						<label class="radio">
							<input type="radio" value="cron" bind:group={form.mode} />
							Raw cron
						</label>
					</div>
				</div>

				{#if form.mode === 'shortcut'}
					<label class="full">
						Shortcut
						<input bind:value={form.shortcut} placeholder="every 3 days @ 09:00" />
						<small class="muted">
							Examples: <code>every 3 days @ 09:00</code> · <code>daily @ 18:00</code> ·
							<code>weekly fri @ 09:00</code> · <code>hourly</code>
						</small>
					</label>
				{:else}
					<label class="full">
						Cron expression (5 fields: min hour dom mon dow)
						<input bind:value={form.cronExpression} placeholder="0 9 * * *" />
					</label>
				{/if}

				<label>
					Window (days)
					<input type="number" min="1" max="60" bind:value={form.windowDays} />
				</label>
				<label>
					Timezone
					<input bind:value={form.timezone} />
				</label>
				<label class="checkbox">
					<input type="checkbox" bind:checked={form.skipEmpty} />
					Skip when window has no items
				</label>
				<label class="checkbox">
					<input type="checkbox" bind:checked={form.enabled} />
					Enabled
				</label>
			</div>

			{#if saveError}
				<p class="error">{saveError}</p>
			{/if}

			<div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
				<button type="submit" class="btn primary">Save</button>
				<button type="button" class="btn" onclick={cancel}>Cancel</button>
			</div>
		</form>
	</section>
{/if}

<style>
	h1 {
		margin: 0 0 1rem;
	}
	h2 {
		margin: 0 0 0.8rem;
		font-size: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8rem;
	}
	.grid label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	.grid label.full,
	.grid > div.full {
		grid-column: 1 / -1;
	}
	.grid label.checkbox,
	.grid label.radio {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
	}
	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.4rem;
		margin-top: 0.3rem;
	}
	.error {
		color: #fca5a5;
		margin: 0.5rem 0 0;
	}
	small.muted {
		font-size: 0.75rem;
	}
</style>
