<script>
	import { onMount } from 'svelte';
	import { auth, setAuth, clearAuth, loadPersistedAuth } from '$lib/auth.svelte.js';
	import { refreshRequest, fetchRecords, createRecord, updateRecord, deleteRecord, BASE_URL } from '$lib/api.js';
	import { emptyRecord, fromApiRecord, toApiPayload } from '$lib/model.js';
	import { validateForCreate, validateForUpdate } from '$lib/validation.js';

	import LoginPanel from '$lib/components/LoginPanel.svelte';
	import PropertyForm from '$lib/components/PropertyForm.svelte';
	import PropertyCard from '$lib/components/PropertyCard.svelte';
	import DryRunPanel from '$lib/components/DryRunPanel.svelte';
	import IssuesManager from '$lib/components/IssuesManager.svelte';

	/** @type {'form' | 'list' | 'detail' | 'issues'} */
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

	const DRAFT_STORAGE_KEY = 'casa_property_form_draft';

	// Status priority map for sorting active cards
	const statusPriority = {
		SCHEDULED: 1,
		QUEUED: 2
	};

	const viewingRecord = $derived(records.find((r) => r.id === viewingId));

	// Filter accepted listings for top accordion
	const acceptedRecords = $derived(records.filter((r) => r.status === 'ACCEPTED'));

	// Filter archived listings for bottom accordion
	const archivedRecords = $derived(records.filter((r) => r.status === 'REJECT' || r.status === 'REJECTED'));

	// Main list excludes ACCEPTED and REJECTED, and sorts by priority (SCHEDULED -> QUEUED)
	const mainSortedRecords = $derived(
		records
			.filter((r) => r.status !== 'ACCEPTED' && r.status !== 'REJECT' && r.status !== 'REJECTED')
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

	function clearFormDraft() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(DRAFT_STORAGE_KEY);
		}
	}

	function handleClearDraft() {
		clearFormDraft();
		formRecord = emptyRecord();
	}

	function cancelEdit() {
		editingId = null;
		formRecord = emptyRecord();
		clearFormDraft();
	}

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
			clearFormDraft();
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
	<button
		type="button"
		class="view-tab view-tab-icon"
		class:active={view === 'issues'}
		onclick={() => (view = 'issues')}
		title="Issues & Bug Reports"
		aria-label="Issues & Bug Reports"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
			<path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/>
		</svg>
	</button>
</div>

<!-- ══ MAIN ════════════════════════════════════════════ -->
<main class="main">
	<div class="connection-hint">
		{auth.token ? `→ Connected to ${BASE_URL.replace(/^https?:\/\//, '')}` : '→ Not connected — submit will dry run'}
	</div>

	{#if statusMessage}
		<div class="status-bar visible {statusMessage.type}">
			<pre class="status-text">{statusMessage.text}</pre>
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
		<PropertyForm
			record={formRecord}
			{editingId}
			{submitLabel}
			onSubmit={submitForm}
			onCancel={cancelEdit}
			onClear={handleClearDraft}
		/>
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
				<!-- ACCORDION FOR ACCEPTED LISTINGS (TOP) -->
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

				<!-- MAIN ACTIVE LIST -->
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

				<!-- ACCORDION FOR ARCHIVED / REJECTED LISTINGS (BOTTOM) -->
				{#if archivedRecords.length > 0}
					<details class="archived-accordion">
						<summary class="archived-summary">
							<span>ARCHIVED / REJECTED ({archivedRecords.length})</span>
						</summary>
						<div class="property-cards accordion-content">
							{#each archivedRecords as record (record.id)}
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
			{/if}
		</div>
	{:else if view === 'issues'}
		<IssuesManager />
	{/if}
</main>

<DryRunPanel bind:open={dryRunOpen} title={dryRunTitle} payload={dryRunPayload} />
