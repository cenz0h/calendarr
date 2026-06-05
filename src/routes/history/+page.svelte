<script lang="ts">
	import type { PageData } from './$types';
	import { fmtDateTime } from '$lib/format-date';

	let { data }: { data: PageData } = $props();

	let expanded = $state<number | null>(null);

	function fmtDate(iso: string): string {
		return fmtDateTime(iso, data.dateFormat);
	}

	function pillFor(status: string) {
		if (status === 'success') return 'ok';
		if (status === 'skipped_empty') return 'warn';
		return 'bad';
	}

	function toggle(id: number) {
		expanded = expanded === id ? null : id;
	}

	function pageHref(offset: number): string {
		const params = new URLSearchParams();
		params.set('limit', String(data.limit));
		params.set('offset', String(Math.max(0, offset)));
		if (data.status) params.set('status', data.status);
		if (data.serviceId) params.set('serviceId', String(data.serviceId));
		return `?${params}`;
	}

	let prevOffset = $derived(Math.max(0, data.offset - data.limit));
	let nextOffset = $derived(data.offset + data.limit);
</script>

<h1>History</h1>

<section class="panel">
	{#if data.rows.length === 0}
		<p class="muted">No post history yet.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>When</th>
					<th>Trigger</th>
					<th>Service</th>
					<th>Schedule</th>
					<th>Window</th>
					<th>Items</th>
					<th>Status</th>
					<th>HTTP</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.id)}
					<tr onclick={() => toggle(r.id)} class="clickable">
						<td>{fmtDate(r.ranAt)}</td>
						<td>{r.trigger}</td>
						<td>{r.serviceName ?? '#' + r.serviceId}</td>
						<td>{r.scheduleName ?? '—'}</td>
						<td>{r.windowDays}d</td>
						<td>{r.itemCount}</td>
						<td><span class="pill {pillFor(r.status)}">{r.status}</span></td>
						<td>{r.httpStatus ?? '—'}</td>
					</tr>
					{#if expanded === r.id}
						<tr>
							<td colspan="8" class="detail">
								{#if r.errorMessage}
									<p class="error"><strong>Error:</strong> {r.errorMessage}</p>
								{/if}
								{#if r.previewJson}
									<details>
										<summary class="muted">Payload sent to Discord</summary>
										<pre>{JSON.stringify(JSON.parse(r.previewJson), null, 2)}</pre>
									</details>
								{:else}
									<p class="muted">No payload recorded.</p>
								{/if}
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>

		<div class="pager">
			<span class="muted">
				{data.offset + 1}–{Math.min(data.offset + data.rows.length, data.total)} of {data.total}
			</span>
			<div style="display: flex; gap: 0.4rem;">
				{#if data.offset > 0}
					<a class="btn" href={pageHref(prevOffset)}>← Prev</a>
				{/if}
				{#if data.offset + data.limit < data.total}
					<a class="btn" href={pageHref(nextOffset)}>Next →</a>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	h1 {
		margin: 0 0 1rem;
	}
	.clickable {
		cursor: pointer;
	}
	.clickable:hover {
		background: #111d31;
	}
	.detail {
		background: #0b1220;
		padding: 0.8rem;
	}
	.error {
		color: #fca5a5;
		margin: 0 0 0.5rem;
	}
	pre {
		background: #020617;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.6rem;
		font-size: 0.75rem;
		max-height: 300px;
		overflow: auto;
	}
	.pager {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.8rem;
	}
</style>
