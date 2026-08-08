<script>
	import { onMount } from 'svelte';
	import { auth, setAuth, clearAuth, loadPersistedAuth } from '$lib/auth.svelte.js';
	import { refreshRequest, fetchRecords, createRecord, updateRecord, deleteRecord, BASE_URL } from '$lib/api.js';
	import { emptyRecord, fromApiRecord, toApiPayload } from '$lib/model.js';
	import { validateForCreate, validateForUpdate } from '$lib/validation.js';

	import LoginPanel from '$lib/components/LoginPanel.svelte';
	import PropertyForm from '$lib/components/PropertyForm.svelte';
	import PropertyCard from '$lib/components/PropertyCard.svelte';
	import PropertyDetail from '$lib/components/PropertyDetail.svelte';
	import DryRunPanel from '$lib/components/DryRunPanel.svelte';

	/** @type {'form' | 'list' | 'detail'} */
	let view = $state('form');

	let records = $state([]); // raw PocketBase records, most recent first
	let totalItems = $state(0);
	let listLoading = $state(false);
	let listError = $state(null);

	let editingId = $state(null);
	let viewingId = $state(null);
	let formRecord = $state(emptyRecord());

	let statusMessage = $state(null); // { type: 'success' | 'error', text }
	let loginOpen = $state(false);

	let dryRunOpen = $state(false);
	let dryRunTitle = $state('');
	let dryRunPayload = $state(null);

	// Status priority map for sorting non-accepted cards
	const statusPriority = {
		SCHEDULED: 1,
		QUEUED: 2,
		REJECT: 3,
		REJECTED: 3
	};

	const viewingRecord = $derived(records.find((r) => r.id === viewingId));

	// Filter accepted listings for the pinned accordion
	const acceptedRecords = $derived(records.filter((r) => r.status === 'ACCEPTED'));

	// Main list excludes ACCEPTED and sorts by priority (SCHEDULED -> QUEUED -> REJECT)
	const mainSortedRecords = $derived(
		records
			.filter((r) => r.status !== 'ACCEPTED')
			.sort((a, b) => {
				const priorityA = statusPriority[a.status] ?? 99;
				const priorityB = statusPriority[b.status] ?? 99;
				return priorityA - priorityB;
			})
	);

	// ── session restore on load ──────────────────────────
	onMount(async () => {
		const saved = loadPersistedAuth();
		if (!saved?.token) return;
		setAuth(saved.token, saved.user); // optimistic, confirmed below
		try {
			const data = await refreshRequest(saved.token);
			setAuth(data.token, data.record);
		} catch {
			clearAuth();
		}
	});

	// ── view switching ────────────────────────────────────
	function newEntry() {
		editingId = null;
		formRecord = emptyRecord();
		view = 'form';
	}

	async function goToList() {
		view = 'list';
		if (auth.token) await loadRecords();
	}

	function goToForm() {
		view = 'form';
	}

	function viewRecord(id) {
		viewingId = id;
		view = 'detail';
	}

	function editRecordById(id) {
		const record = records.find((r) => r.id === id);
		if (!record) {
			statusMessage = { type: 'error', text: 'Could not find that record — try refreshing the list.' };
			return;
		}
		formRecord = fromApiRecord(record);
		editingId = id;
		view = 'form';
	}

	function cancelEdit() {
		editingId = null;
		formRecord = emptyRecord();
	}

	function doLogout() {
		clearAuth();
		records = [];
		if (view === 'list' || view === 'detail') view = 'form';
	}

	// ── saved listings ────────────────────────────────────
	async function loadRecords() {
		listLoading = true;
		listError = null;
		try {
			const data = await fetchRecords(auth.token);
			records = data.items || [];
			totalItems = data.totalItems ?? records.length;
		} catch (err) {
			listError = err.message;
		} finally {
			listLoading = false;
		}
	}

	async function deleteRecordHandler(id) {
		const record = records.find((r) => r.id === id);
		const label = record ? record.address : id;
		if (!confirm(`Delete "${label}"? This can't be undone.`)) return;

		try {
			await deleteRecord(auth.token, id);
			records = records.filter((r) => r.id !== id);
			totalItems = Math.max(0, totalItems - 1);
			if (editingId === id) cancelEdit();
			if (viewingId === id) view = 'list';
			statusMessage = { type: 'success', text: `Deleted — ${label}` };
		} catch (err) {
			statusMessage = { type: 'error', text: err.message };
		}
	}

	// ── submit (create or update) ──────────────────────────
	async function submitForm() {
		statusMessage = null;

		if (!formRecord.address.trim()) {
			statusMessage = { type: 'error', text: 'Address is required.' };
			return;
		}
		if (formRecord.cost_base === '' || formRecord.cost_base === null) {
			statusMessage = { type: 'error', text: 'Base cost is required.' };
			return;
		}

		const payload = toApiPayload(formRecord);
		const isUpdate = !!editingId;

		// ── dry run (not authenticated) ─────────────────────
		if (!auth.token) {
			dryRunTitle = isUpdate
				? `⚠ Dry run — PATCH payload (record ${editingId}, not saved)`
				: '⚠ Dry run — POST payload (not saved)';
			dryRunPayload = payload;
			dryRunOpen = true;
			return;
		}

		const validation = isUpdate ? validateForUpdate(payload, editingId) : validateForCreate(payload);
		if (!validation.valid) {
			statusMessage = { type: 'error', text: validation.errors.join(' ') || 'Validation failed.' };
			return;
		}

		try {
			const data = isUpdate
				? await updateRecord(auth.token, editingId, payload)
				: await createRecord(auth.token, payload);
			statusMessage = {
				type: 'success',
				text: isUpdate ? `Updated — record ${data.id}` : `Saved — record ${data.id}`
			};
			editingId = null;
			formRecord = emptyRecord();
			await goToList(); // post-submission: land on the most-recent-first listing
		} catch (err) {
			statusMessage = { type: 'error', text: err.message };
		}
	}

	const submitLabel = $derived(
		!auth.token ? '⚠ Dry run — not authenticated' : editingId ? 'Update property' : 'Save property'
	);
</script>

<!-- ══ HEADER ══════════════════════════════════════════ -->
<header class="header">
	<span class="header-logo">Casa</span>
	<div class="header-right">
		<div
			class="auth-badge"
			class:authenticated={!!auth.token}
			onclick={() => {
				if (!auth.token) loginOpen = true;
			}}
		>
			<span class="auth-dot"></span>
			<span>{auth.token ? auth.user?.name || auth.user?.email || 'Authenticated' : 'NOT AUTHENTICATED'}</span>
			{#if auth.token}
				<span
					class="auth-signout"
					onclick={(e) => {
						e.stopPropagation();
						doLogout();
					}}
				>
					✕
				</span>
			{/if}
		</div>
	</div>
</header>

<LoginPanel bind:open={loginOpen} />

<!-- ══ VIEW TABS ═══════════════════════════════════════ -->
<div class="view-tabs">
	<button type="button" class="view-tab" class:active={view === 'form'} onclick={newEntry}>+ New entry</button>
	<button type="button" class="view-tab" class:active={view === 'list'} onclick={goToList}>
		Saved <span class="tab-count mono">{totalItems ? `(${totalItems})` : ''}</span>
	</button>
</div>

<!-- ══ MAIN ════════════════════════════════════════════ -->
<main class="main">
	<div class="connection-hint">
		{auth.token ? `→ Connected to ${BASE_URL.replace(/^https?:\/\//, '')}` : '→ Not connected — submit will dry run'}
	</div>

	{#if statusMessage}
		<div class="status-bar visible {statusMessage.type}">
			<span>{statusMessage.text}</span>
			<span class="status-close" onclick={() => (statusMessage = null)}>✕</span>
		</div>
	{/if}

	{#if view === 'form'}
		{#if editingId}
			<div class="editing-banner visible">
				<span class="editing-banner-text">Editing: {formRecord.address}</span>
				<span class="editing-banner-cancel" onclick={cancelEdit}>Cancel</span>
			</div>
		{/if}
		<PropertyForm record={formRecord} {editingId} {submitLabel} onSubmit={submitForm} onCancel={cancelEdit} />
	{:else if view === 'list'}
		<div class="view-list active">
			<div class="list-toolbar">
				<span class="list-summary mono">
					{#if !auth.token}
						—
					{:else if listLoading}
						Loading…
					{:else if listError}
						Error
					{:else}
						{records.length} of {totalItems} — most recent first
					{/if}
				</span>
				<button type="button" class="btn-new-entry" onclick={newEntry}>+ New entry</button>
			</div>

			{#if !auth.token}
				<div class="empty-state">
					<span class="empty-state-title">Sign in to view saved listings</span>
					<span class="empty-state-text">Saved listings are fetched with your auth token, so sign in first.</span>
				</div>
			{:else if listLoading}
				<div class="empty-state">
					<span class="empty-state-title">Loading…</span>
					<span class="empty-state-text">Fetching your saved listings.</span>
				</div>
			{:else if listError}
				<div class="empty-state">
					<span class="empty-state-title">Couldn't load listings</span>
					<span class="empty-state-text">{listError}</span>
				</div>
			{:else if records.length === 0}
				<div class="empty-state">
					<span class="empty-state-title">No listings yet</span>
					<span class="empty-state-text">Properties you save will show up here, most recent first.</span>
				</div>
			{:else}
				<!-- ACCORDION FOR ACCEPTED LISTINGS -->
				{#if acceptedRecords.length > 0}
					<details class="accepted-accordion">
						<summary class="accepted-summary">
							<span>ACCEPTED PROPERTIES ({acceptedRecords.length})</span>
						</summary>
						<div class="property-cards accordion-content">
							{#each acceptedRecords as record (record.id)}
								<PropertyCard
									{record}
									onView={viewRecord}
									onEdit={editRecordById}
									onDelete={deleteRecordHandler}
								/>
							{/each}
						</div>
					</details>
				{/if}

				<!-- MAIN SORTED LIST: SCHEDULED -> QUEUED -> REJECT -->
				<div class="property-cards">
					{#each mainSortedRecords as record (record.id)}
						<PropertyCard
							{record}
							onView={viewRecord}
							onEdit={editRecordById}
							onDelete={deleteRecordHandler}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{:else if view === 'detail' && viewingRecord}
		<PropertyDetail record={viewingRecord} onEdit={editRecordById} onClose={() => (view = 'list')} />
	{/if}
</main>

<DryRunPanel bind:open={dryRunOpen} title={dryRunTitle} payload={dryRunPayload} />

<style>
	.accepted-accordion {
		background-color: rgba(22, 163, 74, 0.08);
		border: 1px solid rgba(22, 163, 74, 0.3);
		border-radius: 8px;
		margin-bottom: 1.25rem;
		padding: 0.5rem 0.75rem;
	}

	.accepted-summary {
		cursor: pointer;
		font-weight: 700;
		color: #15803d;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
		user-select: none;
		outline: none;
	}

	.accordion-content {
		margin-top: 0.75rem;
	}
</style>