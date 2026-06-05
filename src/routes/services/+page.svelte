<script lang="ts">
	import type { PageData } from './$types';
	import type { ArrKind, ArrService } from '$lib/types';
	import { invalidateAll } from '$app/navigation';
	import { DEFAULT_PORTS, splitBaseUrl, joinBaseUrl } from '$lib/url-helpers';

	let { data }: { data: PageData } = $props();

	let editing = $state<ArrService | null>(null);
	let creating = $state(false);
	let saveError = $state<string | null>(null);
	let showApiKey = $state(false);
	let testResults = $state<Record<number, { state: 'busy' | 'ok' | 'fail'; text: string } | undefined>>({});

	let form = $state({
		name: '',
		kind: 'sonarr' as ArrKind,
		host: 'http://',
		port: DEFAULT_PORTS.sonarr,
		apiKey: '',
		webhookUrl: '',
		enabled: true
	});

	function startCreate() {
		creating = true;
		editing = null;
		saveError = null;
		form = {
			name: '',
			kind: 'sonarr',
			host: 'http://',
			port: DEFAULT_PORTS.sonarr,
			apiKey: '',
			webhookUrl: '',
			enabled: true
		};
	}

	function startEdit(s: ArrService) {
		creating = false;
		editing = s;
		saveError = null;
		const { host, port } = splitBaseUrl(s.baseUrl);
		form = {
			name: s.name,
			kind: s.kind,
			host: host || 'http://',
			port: port || DEFAULT_PORTS[s.kind],
			apiKey: '',
			webhookUrl: s.webhookUrl,
			enabled: s.enabled
		};
	}

	function cancel() {
		creating = false;
		editing = null;
		saveError = null;
	}

	function onKindChange() {
		const otherDefault = form.kind === 'sonarr' ? DEFAULT_PORTS.radarr : DEFAULT_PORTS.sonarr;
		if (!form.port || form.port === otherDefault) {
			form.port = DEFAULT_PORTS[form.kind];
		}
	}

	async function save() {
		saveError = null;
		const baseUrl = joinBaseUrl(form.host, form.port);
		if (!baseUrl) {
			saveError = 'Host is required';
			return;
		}
		const url = editing ? `/api/services/${editing.id}` : '/api/services';
		const method = editing ? 'PATCH' : 'POST';
		const body: Record<string, unknown> = {
			name: form.name,
			kind: form.kind,
			baseUrl,
			webhookUrl: form.webhookUrl,
			enabled: form.enabled
		};
		if (form.apiKey) body.apiKey = form.apiKey;
		if (!editing && !form.apiKey) {
			saveError = 'API key is required';
			return;
		}
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
		if (!confirm('Delete this service?')) return;
		const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
		if (res.ok) await invalidateAll();
	}

	async function test(id: number) {
		testResults = { ...testResults, [id]: { state: 'busy', text: 'testing…' } };
		const res = await fetch(`/api/services/${id}/test`, { method: 'POST' });
		const body = await res.json();
		testResults = {
			...testResults,
			[id]: body.ok
				? { state: 'ok', text: `OK · v${body.version} · ${body.latencyMs}ms` }
				: { state: 'fail', text: body.error ?? 'failed' }
		};
	}
</script>

<h1>Services</h1>

<section class="panel">
	<div style="display: flex; justify-content: space-between; align-items: center;">
		<h2>Sonarr / Radarr instances</h2>
		<button class="btn primary" onclick={startCreate}>+ Add service</button>
	</div>

	{#if data.services.length === 0}
		<p class="muted">No services configured yet.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Kind</th>
					<th>Base URL</th>
					<th>Webhook</th>
					<th>Enabled</th>
					<th>Last test</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.services as s (s.id)}
					{@const result = testResults[s.id]}
					<tr>
						<td><strong>{s.name}</strong></td>
						<td>{s.kind}</td>
						<td class="muted truncate">{s.baseUrl}</td>
						<td class="muted truncate">{s.webhookUrl.slice(0, 40)}…</td>
						<td><span class="pill {s.enabled ? 'ok' : 'bad'}">{s.enabled ? 'yes' : 'no'}</span></td>
						<td>
							{#if result}
								<span class="pill {result.state === 'ok' ? 'ok' : result.state === 'fail' ? 'bad' : 'warn'}" title={result.text}>
									{result.text}
								</span>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
						<td style="white-space: nowrap;">
							<button class="btn" onclick={() => test(s.id)} disabled={result?.state === 'busy'}>Test</button>
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
		<h2>{editing ? `Edit ${editing.name}` : 'Add service'}</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<div class="grid">
				<label>
					Name
					<input bind:value={form.name} required />
				</label>
				<label>
					Kind
					<select bind:value={form.kind} onchange={onKindChange}>
						<option value="sonarr">Sonarr</option>
						<option value="radarr">Radarr</option>
					</select>
				</label>
				<label>
					Host
					<input bind:value={form.host} placeholder="http://192.168.x.y" required />
				</label>
				<label>
					Port
					<input
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						bind:value={form.port}
						placeholder={DEFAULT_PORTS[form.kind]}
					/>
				</label>
				<label class="full">
					API key {editing ? '(leave blank to keep existing)' : ''}
					<div style="display: flex; gap: 0.4rem;">
						<input
							type={showApiKey ? 'text' : 'password'}
							bind:value={form.apiKey}
							style="flex: 1;"
							placeholder={editing ? '••• unchanged •••' : ''}
						/>
						<button type="button" class="btn" onclick={() => (showApiKey = !showApiKey)}>
							{showApiKey ? 'Hide' : 'Show'}
						</button>
					</div>
				</label>
				<label class="full">
					Discord webhook URL
					<input
						bind:value={form.webhookUrl}
						placeholder="https://discord.com/api/webhooks/..."
						required
					/>
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
	.grid label.full {
		grid-column: 1 / -1;
	}
	.grid label.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		grid-column: 1 / -1;
	}
	.error {
		color: #fca5a5;
		margin: 0.5rem 0 0;
	}
	.truncate {
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
