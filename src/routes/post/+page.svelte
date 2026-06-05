<script lang="ts">
	import type { PageData } from './$types';
	import type { DiscordWebhookPayload } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let serviceIds = $state<number[]>(data.services.length ? [data.services[0].id] : []);
	let windowDays = $state(7);
	let webhookOverride = $state('');

	let preview = $state<{ payload: DiscordWebhookPayload; itemCount: number } | null>(null);
	let busy = $state(false);
	let sendResult = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	function toggle(id: number) {
		if (serviceIds.includes(id)) serviceIds = serviceIds.filter((x) => x !== id);
		else serviceIds = [...serviceIds, id];
	}

	async function doPreview() {
		errorMsg = null;
		sendResult = null;
		preview = null;
		if (serviceIds.length !== 1) {
			errorMsg = 'Preview supports one service at a time. Pick exactly one to preview.';
			return;
		}
		busy = true;
		try {
			const res = await fetch('/api/post/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ serviceId: serviceIds[0], windowDays, timezone: data.defaultTz })
			});
			if (!res.ok) {
				errorMsg = await res.text();
				return;
			}
			preview = await res.json();
		} finally {
			busy = false;
		}
	}

	async function doSend() {
		errorMsg = null;
		sendResult = null;
		if (serviceIds.length === 0) {
			errorMsg = 'Pick at least one service.';
			return;
		}
		busy = true;
		try {
			const res = await fetch('/api/post/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					serviceIds,
					windowDays,
					webhookOverride: webhookOverride || undefined,
					timezone: data.defaultTz
				})
			});
			if (!res.ok) {
				errorMsg = await res.text();
				return;
			}
			const body = await res.json();
			sendResult = body.results
				.map((r: { serviceId: number; status: string; itemCount: number; error?: string }) => {
					const name = data.services.find((s) => s.id === r.serviceId)?.name ?? `#${r.serviceId}`;
					return `${name}: ${r.status} (${r.itemCount} items)${r.error ? ' — ' + r.error : ''}`;
				})
				.join('\n');
		} finally {
			busy = false;
		}
	}
</script>

<h1>Post now</h1>

<section class="panel">
	<h2>Pick services</h2>
	{#if data.services.length === 0}
		<p class="muted">Add a service on the <a href="/services">Services</a> page first.</p>
	{:else}
		<div class="services-grid">
			{#each data.services as s (s.id)}
				<label class="row">
					<input
						type="checkbox"
						checked={serviceIds.includes(s.id)}
						onchange={() => toggle(s.id)}
					/>
					{s.name} <span class="muted">({s.kind})</span>
				</label>
			{/each}
		</div>

		<div class="grid">
			<label>
				Window (days)
				<input type="number" min="1" max="60" bind:value={windowDays} />
			</label>
			<label class="full">
				Webhook override (optional)
				<input bind:value={webhookOverride} placeholder="https://discord.com/api/webhooks/..." />
			</label>
		</div>

		<div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
			<button class="btn" onclick={doPreview} disabled={busy}>Preview (1 service)</button>
			<button class="btn primary" onclick={doSend} disabled={busy || serviceIds.length === 0}>
				Send
			</button>
		</div>

		{#if errorMsg}
			<p class="error">{errorMsg}</p>
		{/if}
		{#if sendResult}
			<pre class="result">{sendResult}</pre>
		{/if}
	{/if}
</section>

{#if preview}
	<section class="panel" style="margin-top: 1rem;">
		<h2>Preview ({preview.itemCount} item{preview.itemCount === 1 ? '' : 's'})</h2>
		{#if preview.payload.content}
			<div class="content-heading">{preview.payload.content}</div>
		{/if}
		<div class="embed-stack">
			{#each preview.payload.embeds ?? [] as embed}
				<div
					class="embed"
					style="border-left-color: {'#' + (embed.color ?? 0).toString(16).padStart(6, '0')};"
				>
					{#if embed.title}
						<h3>{embed.title}</h3>
					{/if}
					{#if embed.description}
						<p class="description">{embed.description}</p>
					{/if}
					{#each embed.fields ?? [] as field}
						<div class="field">
							<div class="field-name">{field.name}</div>
							<div class="field-value">{field.value}</div>
						</div>
					{/each}
					{#if embed.footer}
						<div class="footer muted">{embed.footer.text}</div>
					{/if}
				</div>
			{/each}
		</div>
		<details style="margin-top: 0.8rem;">
			<summary class="muted">Raw payload</summary>
			<pre>{JSON.stringify(preview.payload, null, 2)}</pre>
		</details>
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
	h3 {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		font-weight: 700;
	}
	.content-heading {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 0.6rem;
		white-space: pre-line;
	}
	.description {
		white-space: pre-line;
		font-size: 0.85rem;
		color: #d4d7dc;
		margin: 0;
	}
	.services-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.4rem;
		margin-bottom: 0.8rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr 2fr;
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
	.error {
		color: #fca5a5;
	}
	.result {
		background: #0b1220;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.6rem;
		font-size: 0.85rem;
		white-space: pre-wrap;
	}
	.embed {
		background: #2b2d31;
		border-left: 4px solid #38bdf8;
		border-radius: 4px;
		padding: 0.6rem 0.8rem;
		margin-bottom: 0.6rem;
	}
	.field {
		margin-top: 0.5rem;
	}
	.field-name {
		font-weight: 600;
		font-size: 0.85rem;
		margin-bottom: 0.2rem;
	}
	.field-value {
		white-space: pre-line;
		font-size: 0.85rem;
		color: #d4d7dc;
	}
	.footer {
		margin-top: 0.5rem;
		font-size: 0.75rem;
	}
	pre {
		background: #0b1220;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.6rem;
		font-size: 0.75rem;
		overflow: auto;
		max-height: 300px;
	}
</style>
