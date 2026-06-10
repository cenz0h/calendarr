<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { fmtDateTime } from '$lib/format-date';

	let { data }: { data: PageData } = $props();

	let testing = $state<Record<number, string | null>>({});
	let posting = $state<Record<number, string | null>>({});

	function fmtDate(iso: string | null | undefined): string {
		return fmtDateTime(iso, data.dateFormat, data.tz);
	}

	function statusPill(status: string | null | undefined) {
		if (!status) return { cls: '', label: 'never' };
		if (status === 'success') return { cls: 'ok', label: 'success' };
		if (status === 'skipped_empty') return { cls: 'warn', label: 'skipped' };
		if (status === 'error') return { cls: 'bad', label: 'error' };
		if (status === 'partial') return { cls: 'warn', label: 'partial' };
		return { cls: '', label: status };
	}

	async function testService(id: number) {
		testing = { ...testing, [id]: 'testing…' };
		const res = await fetch(`/api/services/${id}/test`, { method: 'POST' });
		const body = await res.json();
		testing = {
			...testing,
			[id]: body.ok ? `OK (v${body.version}, ${body.latencyMs}ms)` : `FAIL: ${body.error}`
		};
	}

	async function postNow(id: number, windowDays: number) {
		posting = { ...posting, [id]: 'sending…' };
		const res = await fetch('/api/post/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ serviceIds: [id], windowDays })
		});
		const body = await res.json();
		const r = body.results?.[0];
		posting = {
			...posting,
			[id]: r
				? r.status === 'success'
					? `Sent ${r.itemCount} item${r.itemCount === 1 ? '' : 's'}`
					: `${r.status}${r.error ? ': ' + r.error : ''}`
				: 'unknown'
		};
		await invalidateAll();
	}
</script>

<h1>Dashboard</h1>

<section class="panel">
	<h2>Services</h2>
	{#if data.services.length === 0}
		<p class="muted">No services yet. <a href="/services">Add one</a> to get started.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Kind</th>
					<th>Base URL</th>
					<th>Enabled</th>
					<th>Test</th>
					<th>Post now (7d)</th>
				</tr>
			</thead>
			<tbody>
				{#each data.services as service (service.id)}
					<tr>
						<td>{service.name}</td>
						<td>{service.kind}</td>
						<td class="muted">{service.baseUrl}</td>
						<td>
							<span class="pill {service.enabled ? 'ok' : 'bad'}">
								{service.enabled ? 'yes' : 'no'}
							</span>
						</td>
						<td>
							<button class="btn" onclick={() => testService(service.id)}>Test</button>
							{#if testing[service.id]}
								<span class="muted" style="margin-left: 0.5rem;">{testing[service.id]}</span>
							{/if}
						</td>
						<td>
							<button class="btn primary" onclick={() => postNow(service.id, 7)}>Post 7d</button>
							{#if posting[service.id]}
								<span class="muted" style="margin-left: 0.5rem;">{posting[service.id]}</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="panel" style="margin-top: 1rem;">
	<h2>Schedules</h2>
	{#if data.schedules.length === 0}
		<p class="muted">No schedules yet. <a href="/schedules">Add one</a> to publish automatically.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>When</th>
					<th>Window</th>
					<th>Enabled</th>
					<th>Next run</th>
					<th>Last run</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.schedules as s (s.id)}
					{@const pill = statusPill(s.lastRunStatus)}
					<tr>
						<td>{s.name}</td>
						<td><code>{s.shortcut ?? s.cronExpression}</code></td>
						<td>{s.windowDays}d</td>
						<td>
							<span class="pill {s.enabled ? 'ok' : 'bad'}">{s.enabled ? 'yes' : 'no'}</span>
						</td>
						<td>{fmtDate(data.nextRuns[s.id])}</td>
						<td>{fmtDate(s.lastRunAt)}</td>
						<td><span class="pill {pill.cls}">{pill.label}</span></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="panel" style="margin-top: 1rem;">
	<h2>Recent posts</h2>
	{#if data.recent.length === 0}
		<p class="muted">No posts yet.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>When</th>
					<th>Trigger</th>
					<th>Service</th>
					<th>Items</th>
					<th>Status</th>
					<th>HTTP</th>
				</tr>
			</thead>
			<tbody>
				{#each data.recent as h (h.id)}
					{@const pill = statusPill(h.status)}
					<tr>
						<td>{fmtDate(h.ranAt)}</td>
						<td>{h.trigger}</td>
						<td>{h.serviceName ?? '#' + h.serviceId}</td>
						<td>{h.itemCount}</td>
						<td><span class="pill {pill.cls}">{pill.label}</span></td>
						<td>{h.httpStatus ?? '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p style="margin-top: 0.6rem;"><a href="/history">View full history →</a></p>
	{/if}
</section>

<style>
	h1 {
		margin: 0 0 1rem;
	}
	h2 {
		margin: 0 0 0.8rem;
		font-size: 1rem;
	}
</style>
