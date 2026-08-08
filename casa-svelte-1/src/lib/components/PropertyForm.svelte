<script>
	import { onMount } from 'svelte';
	import { emptyRecord, recordTotal } from '$lib/model.js';
	import { computeStatus, parseCoordinates, distanceFromRef } from '$lib/derive.js';
	import { formatMoney } from '$lib/format.js';
	import { validateUrl, validateTourDate, validateRecord, validateNavigationUrl } from '$lib/validation.js';

	let {
		record = $bindable(),
		editingId = null,
		submitLabel = 'Save property',
		onSubmit,
		onCancel,
		onClear
	} = $props();

	const DRAFT_STORAGE_KEY = 'casa_property_form_draft';

	// Compute current local time ISO string for datetime-local min attribute
	const minDateTime = $derived.by(() => {
		const now = new Date();
		const tzOffset = now.getTimezoneOffset() * 60000;
		return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
	});

	// Restore draft on mount if creating a new entry
	onMount(() => {
		if (!editingId && typeof window !== 'undefined') {
			try {
				const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
				if (savedDraft) {
					const parsed = JSON.parse(savedDraft);
					Object.assign(record, parsed);
				}
			} catch (e) {
				console.warn('Could not restore draft from localStorage', e);
			}
		}
	});

	// Automatically persist form state changes to local storage
	$effect(() => {
		const serialized = JSON.stringify(record);
		if (typeof window !== 'undefined' && !editingId) {
			localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
		}
	});

	// Force default verdict fallback
	if (!record.verdict) {
		record.verdict = 'UNDECIDED';
	}

	// Force default internet cost fallback
	if (record.cost_internet === undefined || record.cost_internet === '') {
		record.cost_internet = 40;
	}

	const total = $derived(recordTotal(record));
	const liveDistance = $derived.by(() => {
		const coords = parseCoordinates(record.coordinates_input);
		return coords ? distanceFromRef(coords) : undefined;
	});

	// Live validation state derivations
	const urlValidation = $derived.by(() => validateUrl(record.url));
	const navigationUrlValidation = $derived.by(() => validateNavigationUrl(record.navigation_url));
	const tourDateValidation = $derived.by(() => validateTourDate(record.tour_date));
	const allValidation = $derived.by(() => validateRecord(record));

	// Derive live status based on verdict and tour date
	const liveStatus = $derived(computeStatus(record.verdict, record.tour_date));

	// Keep record.status read-only & bound to computed status
	$effect(() => {
		if (liveStatus) {
			record.status = liveStatus;
		}
	});

	// Automatically check tour_requested if tour_date is provided
	$effect(() => {
		if (record.tour_date) {
			record.tour_requested = true;
		}
	});

	function toggleChip(field) {
		record[field] = !record[field];
	}

	function addCostOtherRow() {
		if (!Array.isArray(record.cost_other)) {
			record.cost_other = [];
		}
		record.cost_other = [...record.cost_other, { label: '', amount: '' }];
	}

	function removeCostOtherRow(index) {
		if (!Array.isArray(record.cost_other)) return;
		record.cost_other = record.cost_other.filter((_, i) => i !== index);
	}

	function handleClearDraft() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(DRAFT_STORAGE_KEY);
		}
		if (onClear) {
			onClear();
		} else {
			record = emptyRecord();
		}
	}
</script>

<div class="view-form active">
	<!-- IDENTITY ─────────────────────────────────────── -->
	<section class="section">
		<div class="section-label">Identity</div>
		<div class="field">
			<label class="field-label" for="address">Address <span class="req">*</span></label>
			<input type="text" id="address" placeholder="44 Ontario Street, Ottawa" bind:value={record.address} required />
		</div>
		<div class="field">
			<label class="field-label" for="cost_base">Base cost <span class="req">*</span></label>
			<input type="number" id="cost_base" placeholder="0" bind:value={record.cost_base} required />
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="url">Listing URL <span class="req">*</span></label>
				<input
					type="url"
					id="url"
					placeholder="https://rentals.ca/…"
					bind:value={record.url}
					class:input-error={!urlValidation.valid}
					required
				/>
				{#if !urlValidation.valid}
					<div class="error-msg">{urlValidation.message}</div>
				{/if}
			</div>
			<div class="field">
				<label class="field-label" for="contact">Contact</label>
				<input
					type="text"
					id="contact"
					placeholder="Jane, tel:+16135550101, mailto:jane@example.com"
					bind:value={record.contact}
				/>
			</div>
		</div>
	</section>
	<div class="divider"></div>

	<!-- LOCATION & TOUR ──────────────────────────────── -->
	<section class="section">
		<div class="section-label">Location & Tour</div>
		<div class="field">
			<label class="field-label" for="navigation_url">Navigation URL</label>
			<input
				type="text"
				id="navigation_url"
				placeholder="https://maps.example.com/…"
				bind:value={record.navigation_url}
				class:input-error={!navigationUrlValidation.valid}
			/>
			{#if !navigationUrlValidation.valid}
				<div class="error-msg">{navigationUrlValidation.message}</div>
			{/if}
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="coordinates">Location (lat,lon)</label>
				<input
					type="text"
					id="coordinates"
					placeholder="45.4231,-75.6892"
					bind:value={record.coordinates_input}
				/>
			</div>
			<div class="field">
				<label class="field-label" for="distance_from_ref">Distance from ref (read-only)</label>
				<input
					type="text"
					id="distance_from_ref"
					value={liveDistance !== undefined ? `${liveDistance} km` : '—'}
					disabled
				/>
			</div>
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="tour_requested">Tour Status</label>
				<label class="checkbox-box-field" class:disabled={!!record.tour_date}>
					<input
						type="checkbox"
						id="tour_requested"
						bind:checked={record.tour_requested}
						disabled={!!record.tour_date}
					/>
					<span class="checkbox-box-label">Tour requested</span>
				</label>
			</div>
			<div class="field">
				<label class="field-label" for="tour_date">Tour date & time</label>
				<input
					type="datetime-local"
					id="tour_date"
					min={minDateTime}
					bind:value={record.tour_date}
					class:input-error={!tourDateValidation.valid}
				/>
				{#if !tourDateValidation.valid}
					<div class="error-msg">{tourDateValidation.message}</div>
				{/if}
			</div>
		</div>
	</section>
	<div class="divider"></div>

	<!-- UNIT ─────────────────────────────────────────── -->
	<section class="section">
		<div class="section-label">Unit</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="laundry_type">Laundry type</label>
				<select id="laundry_type" bind:value={record.laundry_type}>
					<option value="coin-operated">Coin-operated</option>
					<option value="in-unit">In-unit</option>
					<option value="none">None</option>
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="move_in">Move-in date</label>
				<input type="date" id="move_in" bind:value={record.move_in} />
			</div>
		</div>
	</section>
	<div class="divider"></div>

	<!-- AMENITIES ────────────────────────────────────── -->
	<section class="section">
		<div class="section-label">Amenities</div>
		<div class="chip-row">
			{#each [['has_parking', 'Parking'], ['parking_nearby', 'Parking nearby'], ['has_storage', 'Storage'], ['has_gym', 'Gym'], ['has_pool', 'Pool'], ['is_furnished', 'Furnished']] as [field, label]}
				<button
					type="button"
					class="chip"
					class:active={record[field]}
					onclick={() => toggleChip(field)}
				>
					{label}
				</button>
			{/each}
		</div>
	</section>
	<div class="divider"></div>

	<!-- COSTS ────────────────────────────────────────── -->
	<section class="section">
		<div class="section-label">Monthly costs</div>
		<div class="grid-3">
			<div class="field">
				<label class="field-label" for="cost_heat">Heat</label>
				<input type="number" id="cost_heat" bind:value={record.cost_heat} />
			</div>
			<div class="field">
				<label class="field-label" for="cost_water">Water</label>
				<input type="number" id="cost_water" bind:value={record.cost_water} />
			</div>
			<div class="field">
				<label class="field-label" for="cost_power">Power</label>
				<input type="number" id="cost_power" bind:value={record.cost_power} />
			</div>
			<div class="field">
				<label class="field-label" for="cost_internet">Internet</label>
				<input type="number" id="cost_internet" bind:value={record.cost_internet} />
			</div>
			<div class="field">
				<label class="field-label" for="cost_laundry">Laundry</label>
				<input type="number" id="cost_laundry" bind:value={record.cost_laundry} />
			</div>
			<div class="field">
				<label class="field-label" for="cost_parking">Parking</label>
				<input type="number" id="cost_parking" bind:value={record.cost_parking} />
			</div>
		</div>

		<div class="cost-other">
			<div class="field-label">Other expenses</div>
			{#each record.cost_other || [] as row, i}
				<div class="cost-other-row">
					<input type="text" placeholder="label (e.g. storage)" bind:value={row.label} />
					<input type="number" placeholder="0" bind:value={row.amount} />
					<button type="button" class="btn-remove-other" onclick={() => removeCostOtherRow(i)}>−</button>
				</div>
			{/each}
			<button type="button" class="btn-add-other" onclick={addCostOtherRow}>+ Add expense</button>
		</div>

		<div class="cost-total-row">
			<span class="cost-total-label">Monthly total</span>
			<span class="cost-total-value mono" class:warn={total > 1300 && total <= 1500} class:over={total > 1500}>
				{formatMoney(total)}
			</span>
		</div>
	</section>
	<div class="divider"></div>

	<!-- EVALUATION ───────────────────────────────────── -->
	<section class="section">
		<div class="section-label section-label-eval">
			<span>Evaluation</span>
			<span class="subtle-score">Score: {record.score ?? '—'}</span>
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="status_readonly">Status (read-only)</label>
				<input type="text" id="status_readonly" value={record.status} disabled class="input-readonly" />
			</div>
			<div class="field">
				<label class="field-label" for="verdict">Verdict</label>
				<select id="verdict" bind:value={record.verdict}>
					<option value="UNDECIDED">Undecided</option>
					<option value="YES">Yes</option>
					<option value="NO">No</option>
					<option value="MAYBE">Maybe</option>
				</select>
			</div>
		</div>

		<details class="field-expandable">
			<summary>Reviews</summary>
			<textarea placeholder="Google reviews summary…" bind:value={record.reviews}></textarea>
		</details>

		<div class="field">
			<label class="field-label" for="notes">Notes <span class="hint">(HTML)</span></label>
			<textarea id="notes" placeholder="Anything else…" bind:value={record.notes}></textarea>
		</div>
	</section>

	<!-- SUBMIT & ACTIONS ─────────────────────────────── -->
	<div class="form-actions">
		{#if editingId}
			<button type="button" class="btn-secondary" onclick={onCancel}>Cancel edit</button>
		{:else}
			<button type="button" class="btn-secondary" onclick={handleClearDraft}>Clear draft</button>
		{/if}
		<button
			type="button"
			class="btn-submit"
			class:dry-run={submitLabel.startsWith('⚠') || !allValidation.valid}
			disabled={!allValidation.valid}
			onclick={onSubmit}
		>
			{submitLabel}
		</button>
	</div>

	<!-- DUPLICATED FORM ERRORS BELOW SUBMIT BUTTON -->
	{#if !allValidation.valid}
		<div class="form-bottom-errors">
			<div class="form-bottom-errors-title">Validation errors:</div>
			<ul>
				{#each allValidation.errors as err}
					<li>{err}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
