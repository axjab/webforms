<script>
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth.svelte.js';
	import { fetchIssues, createIssue, updateIssue, deleteIssue } from '$lib/api.js';
	import { formatDate } from '$lib/format.js';

	let issues = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let formError = $state(null);
	let formSuccess = $state(null);

	// Accordion state (collapsed by default)
	let isClosedExpanded = $state(false);

	// Derived issues split
	let openIssues = $derived(issues.filter((i) => i.status === 'Open'));
	let closedIssues = $derived(issues.filter((i) => i.status === 'Closed'));

	// Form state
	let desc = $state('');
	let type = $state('BUG'); // BUG | UPGRADE
	let priority = $state('low'); // low | medium | high
	let isSubmitting = $state(false);

	onMount(() => {
		loadIssues();
	});

	async function loadIssues() {
		loading = true;
		error = null;
		try {
			const data = await fetchIssues();
			issues = data.items || [];
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		formError = null;
		formSuccess = null;

		if (!desc.trim()) {
			formError = 'Please provide a description.';
			return;
		}

		isSubmitting = true;
		try {
			const payload = {
				desc: desc.trim(),
				type,
				status: 'Open',
				priority
			};

			const newIssue = await createIssue(payload, auth.token);
			issues = [newIssue, ...issues];
			desc = '';
			type = 'BUG';
			priority = 'low';
			formSuccess = 'Issue reported successfully!';
		} catch (err) {
			formError = err.message;
		} finally {
			isSubmitting = false;
		}
	}

	async function toggleStatus(issue) {
		if (!auth.token) {
			alert('You must be signed in to change issue status.');
			return;
		}

		const nextStatus = issue.status === 'Open' ? 'Closed' : 'Open';
		try {
			const updated = await updateIssue(issue.id, { status: nextStatus }, auth.token);
			issues = issues.map((i) => (i.id === issue.id ? updated : i));
		} catch (err) {
			alert(`Failed to update status: ${err.message}`);
		}
	}

	async function handleDelete(id) {
		if (!auth.token) {
			alert('You must be signed in to delete issues.');
			return;
		}
		if (!confirm('Are you sure you want to delete this issue?')) return;

		try {
			await deleteIssue(id, auth.token);
			issues = issues.filter((i) => i.id !== id);
		} catch (err) {
			alert(`Failed to delete: ${err.message}`);
		}
	}
</script>

{#snippet issueCard(issue)}
	<div class="issue-card" class:closed={issue.status === 'Closed'}>
		<div class="issue-header">
			<div class="issue-badges">
				<span class="badge type-{issue.type.toLowerCase()}">{issue.type}</span>
				<span class="badge priority-{issue.priority}">{issue.priority}</span>
				<span class="badge status-{issue.status.toLowerCase()}">{issue.status}</span>
			</div>
			<span class="issue-date mono">{formatDate(issue.created)}</span>
		</div>

		<p class="issue-desc">{issue.desc}</p>

		<div class="issue-actions">
			{#if auth.token}
				<button
					type="button"
					class="btn-action-small"
					onclick={() => toggleStatus(issue)}
				>
					Mark as {issue.status === 'Open' ? 'Closed' : 'Open'}
				</button>
				<button
					type="button"
					class="btn-action-small delete"
					onclick={() => handleDelete(issue.id)}
				>
					Delete
				</button>
			{/if}
		</div>
	</div>
{/snippet}

<div class="issues-container">
	<!-- REPORT FORM -->
	<div class="issue-form-card">
		<h3 class="section-title">Report Bug or Idea</h3>

		{#if formError}
			<div class="msg-box error">{formError}</div>
		{/if}
		{#if formSuccess}
			<div class="msg-box success">{formSuccess}</div>
		{/if}

		<form onsubmit={handleSubmit} class="issue-form">
			<div class="field">
				<label for="issue-desc" class="field-label">Description</label>
				<textarea
					id="issue-desc"
					placeholder="Describe the bug or feature request..."
					bind:value={desc}
					rows="3"
				></textarea>
			</div>

			<div class="grid-2">
				<div class="field">
					<label for="issue-type" class="field-label">Type</label>
					<select id="issue-type" bind:value={type}>
						<option value="BUG">🐛 Bug</option>
						<option value="UPGRADE">💡 Upgrade / Idea</option>
					</select>
				</div>

				<div class="field">
					<label for="issue-priority" class="field-label">Priority</label>
					<select id="issue-priority" bind:value={priority}>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>
			</div>

			<button type="submit" class="btn-submit" disabled={isSubmitting}>
				{isSubmitting ? 'Submitting...' : 'Submit Issue'}
			</button>
		</form>
	</div>

	<!-- ISSUES LIST -->
	<div class="issues-list-section">
		<div class="list-header">
			<h3 class="section-title">Open Issues ({openIssues.length})</h3>
			<button type="button" class="btn-refresh" onclick={loadIssues}>Refresh</button>
		</div>

		{#if loading}
			<div class="empty-state">Loading issues...</div>
		{:else if error}
			<div class="msg-box error">{error}</div>
		{:else if issues.length === 0}
			<div class="empty-state">No issues logged yet.</div>
		{:else}
			<!-- OPEN ISSUES -->
			{#if openIssues.length === 0}
				<div class="empty-state">No open issues right now!</div>
			{:else}
				<div class="issues-list">
					{#each openIssues as issue (issue.id)}
						{@render issueCard(issue)}
					{/each}
				</div>
			{/if}

			<!-- CLOSED ISSUES ACCORDION -->
			{#if closedIssues.length > 0}
				<div class="accordion-section">
					<button
						type="button"
						class="accordion-toggle"
						onclick={() => (isClosedExpanded = !isClosedExpanded)}
					>
						<span>Closed Issues ({closedIssues.length})</span>
						<span class="chevron" class:expanded={isClosedExpanded}>▼</span>
					</button>

					{#if isClosedExpanded}
						<div class="issues-list accordion-content">
							{#each closedIssues as issue (issue.id)}
								{@render issueCard(issue)}
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.issues-container {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 12px;
	}

	.issue-form-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 16px;
	}

	.issue-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.msg-box {
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 12px;
		margin-bottom: 10px;
	}
	.msg-box.error {
		background: rgba(248, 81, 73, 0.1);
		border: 1px solid var(--red);
		color: var(--red);
	}
	.msg-box.success {
		background: rgba(63, 185, 80, 0.1);
		border: 1px solid var(--green);
		color: var(--green);
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.btn-refresh {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--muted);
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 11px;
		cursor: pointer;
	}

	.issues-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.issue-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.issue-card.closed {
		opacity: 0.6;
	}

	.issue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.issue-badges {
		display: flex;
		gap: 6px;
	}

	.badge {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
	}

	.badge.type-bug {
		color: var(--red);
		border-color: rgba(248, 81, 73, 0.4);
		background: rgba(248, 81, 73, 0.1);
	}
	.badge.type-upgrade {
		color: var(--accent);
		border-color: rgba(124, 156, 255, 0.4);
		background: rgba(124, 156, 255, 0.1);
	}

	.badge.priority-high {
		color: var(--red);
	}
	.badge.priority-medium {
		color: var(--amber);
	}
	.badge.priority-low {
		color: var(--muted);
	}

	.badge.status-open {
		color: var(--green);
		border-color: rgba(63, 185, 80, 0.4);
	}
	.badge.status-closed {
		color: var(--muted);
	}

	.issue-date {
		font-size: 11px;
		color: var(--muted);
	}

	.issue-desc {
		font-size: 13px;
		color: var(--text);
		white-space: pre-wrap;
	}

	.issue-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.btn-action-small {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--muted);
		font-size: 11px;
		padding: 4px 8px;
		border-radius: 4px;
		cursor: pointer;
	}
	.btn-action-small:hover {
		color: var(--text);
		border-color: var(--muted);
	}
	.btn-action-small.delete:hover {
		color: var(--red);
		border-color: var(--red);
	}

	/* ACCORDION STYLES */
	.accordion-section {
		margin-top: 16px;
		border-top: 1px solid var(--border);
		padding-top: 12px;
	}

	.accordion-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 8px 12px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.accordion-toggle:hover {
		background: var(--surface);
		color: var(--text);
	}

	.chevron {
		font-size: 10px;
		transition: transform 0.2s ease;
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.accordion-content {
		margin-top: 10px;
	}

	.empty-state {
		font-size: 12px;
		color: var(--muted);
		padding: 12px 0;
	}
</style>