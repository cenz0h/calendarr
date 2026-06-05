<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();

	const nav = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/services', label: 'Services' },
		{ href: '/schedules', label: 'Schedules' },
		{ href: '/post', label: 'Post now' },
		{ href: '/history', label: 'History' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<div class="app">
	<header class="app-header">
		<div class="brand">
			<strong>Calendarr</strong>
			<span class="muted">— Sonarr &amp; Radarr → Discord</span>
		</div>
		<nav>
			{#each nav as item}
				<a href={item.href} class:active={isActive(item.href, $page.url.pathname)}>{item.label}</a>
			{/each}
		</nav>
	</header>

	<main>
		{@render children?.()}
	</main>

	<footer class="app-footer">
		<span class="muted">LAN-only — API keys are stored in plaintext. Do not expose this UI to the internet without authentication.</span>
	</footer>
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		background: #020617;
		color: #f1f5f9;
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			sans-serif;
	}
	:global(*) {
		box-sizing: border-box;
	}
	:global(a) {
		color: #38bdf8;
	}
	:global(button) {
		font: inherit;
		cursor: pointer;
	}
	:global(input, select, textarea) {
		font: inherit;
		background: #0b1220;
		color: #f1f5f9;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.4rem 0.6rem;
	}
	:global(input:focus, select:focus, textarea:focus) {
		outline: none;
		border-color: #38bdf8;
	}
	:global(.muted) {
		color: #94a3b8;
	}
	:global(.panel) {
		background: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 8px;
		padding: 1rem;
	}
	:global(.btn) {
		background: #1e293b;
		color: #f1f5f9;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.4rem 0.8rem;
	}
	:global(.btn:hover) {
		background: #334155;
	}
	:global(.btn.primary) {
		background: #0284c7;
		border-color: #0284c7;
	}
	:global(.btn.primary:hover) {
		background: #0369a1;
	}
	:global(.btn.danger) {
		background: #7f1d1d;
		border-color: #7f1d1d;
	}
	:global(.btn.danger:hover) {
		background: #991b1b;
	}
	:global(.pill) {
		display: inline-block;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.7rem;
		background: #1e293b;
		border: 1px solid #334155;
	}
	:global(.pill.ok) {
		background: #064e3b;
		border-color: #065f46;
		color: #6ee7b7;
	}
	:global(.pill.bad) {
		background: #7f1d1d;
		border-color: #991b1b;
		color: #fca5a5;
	}
	:global(.pill.warn) {
		background: #78350f;
		border-color: #92400e;
		color: #fcd34d;
	}
	:global(table) {
		width: 100%;
		border-collapse: collapse;
	}
	:global(table th, table td) {
		text-align: left;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid #1e293b;
		font-size: 0.85rem;
	}
	:global(table th) {
		color: #94a3b8;
		font-weight: 500;
	}

	.app {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr auto;
	}
	.app-header {
		padding: 0.8rem 1.2rem;
		background: #0f172a;
		border-bottom: 1px solid #1e293b;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.8rem;
	}
	.brand {
		font-size: 1rem;
		letter-spacing: 0.02em;
	}
	.brand .muted {
		font-size: 0.85rem;
		margin-left: 0.4rem;
	}
	nav {
		display: flex;
		gap: 0.2rem;
	}
	nav a {
		text-decoration: none;
		padding: 0.35rem 0.7rem;
		border-radius: 6px;
		color: #94a3b8;
		font-size: 0.9rem;
	}
	nav a:hover {
		color: #f1f5f9;
		background: #1e293b;
	}
	nav a.active {
		color: #f1f5f9;
		background: #1e293b;
	}
	main {
		min-height: 0;
		padding: 1rem 1.2rem;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
	}
	.app-footer {
		padding: 0.6rem 1.2rem;
		font-size: 0.75rem;
		background: #0f172a;
		border-top: 1px solid #1e293b;
		text-align: center;
	}
</style>
