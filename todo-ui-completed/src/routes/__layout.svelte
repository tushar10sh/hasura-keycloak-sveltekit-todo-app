<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit';
	import { browser } from '$app/env';
	import { resetAuthInBrowserState } from '$lib/auth/auth_utils';

	export const load: Load = async ({ session }) => {
		if ( ! session?.user ) {
			resetAuthInBrowserState(browser);
		}
		return {
			error: null
		}
	}
</script>

<script lang="ts">
	import Header from '$lib/Header/index.svelte';
	import "../app.postcss";
import { session } from '$app/stores';
</script>

<Header></Header>

<main>
	<slot></slot>
</main>

<footer>
	<p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
</footer>

<style>

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 40px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 40px 0;
		}
	}
</style>

<!-- <slot></slot> -->