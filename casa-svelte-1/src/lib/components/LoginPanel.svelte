<script>
	import { loginRequest, AUTH_IDENTITY } from '$lib/api.js';
	import { setAuth } from '$lib/auth.svelte.js';

	let { open = $bindable(false) } = $props();

	let password = $state('');
	let error = $state('');
	let submitting = $state(false);

	async function submitLogin() {
		error = '';
		submitting = true;
		try {
			const data = await loginRequest(password);
			setAuth(data.token, data.record);
			password = '';
			open = false;
		} catch (err) {
			error = err.message;
		} finally {
			submitting = false;
		}
	}

	function close() {
		open = false;
		error = '';
	}

	function onKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitLogin();
		}
		if (e.key === 'Escape') close();
	}
</script>

{#if open}
	<div class="login-overlay open">
		<div class="login-backdrop" onclick={close}></div>
		<div class="login-panel" role="dialog" aria-modal="true" aria-labelledby="login-panel-title">
			<div class="login-panel-title" id="login-panel-title">Sign in</div>
			<div class="field">
				<label class="field-label" for="login-email">Email</label>
				<input id="login-email" type="email" value={AUTH_IDENTITY} disabled />
			</div>
			<div class="field">
				<label class="field-label" for="login-password">Password</label>
				<input
					id="login-password"
					type="password"
					placeholder="Password"
					bind:value={password}
					onkeydown={onKeydown}
				/>
			</div>
			{#if error}
				<div class="login-error">{error}</div>
			{/if}
			<div class="login-panel-actions">
				<button class="btn-secondary" type="button" onclick={close}>Cancel</button>
				<button class="btn-submit" type="button" onclick={submitLogin} disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
			</div>
		</div>
	</div>
{/if}
