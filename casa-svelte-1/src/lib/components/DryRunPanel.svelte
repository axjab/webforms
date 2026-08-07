<script>
	let { open = $bindable(false), title = '', payload = null } = $props();

	function close() {
		open = false;
	}
</script>

{#if open}
	<div class="dry-run-panel open">
		<div class="dry-run-header">
			<span class="dry-run-title">{title}</span>
			<button class="btn-close-dry-run" type="button" onclick={close}>✕</button>
		</div>
		<pre class="dry-run-pre">{JSON.stringify(payload, null, 2)}</pre>
	</div>
{/if}
