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

	// Icon data definitions for amenities
	const amenitiesConfig = [
		{
			field: 'has_parking',
			label: 'Parking',
			path: 'M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 7H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z'
		},
		{
			field: 'parking_nearby',
			label: 'Parking nearby',
			path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'
		},
		{
			field: 'has_storage',
			label: 'Storage',
			path: 'M20 2H4c-1.1 0-2 .9-2 2v3c0 .72.38 1.36.96 1.72C2.38 9.09 2 9.73 2 10.45V20c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-9.55c0-.72-.38-1.36-.96-1.72.58-.36.96-1 0-1.72V4c0-1.1-.9-2-2-2zm-3 12H7v-2h10v2zm0-7H7V5h10v2z'
		},
		{
			field: 'has_gym',
			label: 'Gym',
			path: 'M20.57 14.86L22 13.43 20.57 12l-1.43 1.43-1.43-1.43L19.14 10.57 17.71 9.14l-1.43 1.43-1.43-1.43 1.43-1.43L14.86 6.29l-1.43 1.43-1.43-1.43L10.57 7.71 9.14 6.29 7.71 7.71l1.43 1.43-1.43 1.43L6.29 9.14 4.86 10.57l1.43 1.43-1.43 1.43L3.43 12 2 13.43l1.43 1.43 1.43-1.43 1.43 1.43-1.43 1.43 1.43 1.43 1.43-1.43 1.43 1.43 1.43-1.43 1.43 1.43 1.43-1.43 1.43 1.43 1.43-1.43-1.43-1.43z'
		},
		{
			field: 'has_pool',
			label: 'Pool',
			path: 'M22 13.5a3.5 3.5 0 0 1-5.5 2.87 3.5 3.5 0 0 1-5 0 3.5 3.5 0 0 1-5 0A3.5 3.5 0 0 1 1 13.5V12h2v1.5a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 8 13.5v-1h2v1a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 15 13.5v-1h2v1a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 22 13.5zm0 4a3.5 3.5 0 0 1-5.5 2.87 3.5 3.5 0 0 1-5 0 3.5 3.5 0 0 1-5 0A3.5 3.5 0 0 1 1 17.5V16h2v1.5a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 8 17.5v-1h2v1a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 15 17.5v-1h2v1a1.5 1.5 0 0 0 2.5 1.13A1.5 1.5 0 0 0 22 17.5zM12 2a3 3 0 0 0-3 3v2h2V5a1 1 0 0 1 2 0v2h2V5a3 3 0 0 0-3-3z'
		},
		{
			field: 'is_furnished',
			label: 'Furnished',
			path: 'M20 10V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v3c-1.1 0-2 .9-2 2v5c0 1.1.9 2 2 2h1a2 2 0 0 0 2-2v-1h10v1a2 2 0 0 0 2 2h1c1.1 0 2-.9 2-2v-5c0-1.1-.9-2-2-2zm-3-3v3H7V7h10z'
		}
	];
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
				<div class="custom-datetime-wrapper" class:input-error={!tourDateValidation.valid}>
					<svg class="datetime-icon" viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 3h-2v5l4.25 2.52.75-1.23-3.5-2.09V11z"/>
					</svg>
					<input
						type="datetime-local"
						id="tour_date"
						min={minDateTime}
						bind:value={record.tour_date}
						class="styled-datetime-input"
					/>
					{#if record.tour_date}
						<button
							type="button"
							class="btn-clear-date"
							onclick={() => (record.tour_date = '')}
							title="Clear tour date"
							aria-label="Clear tour date"
						>
							✕
						</button>
					{/if}
				</div>
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
			{#each amenitiesConfig as { field, label, path }}
				<button
					type="button"
					class="chip"
					class:active={record[field]}
					onclick={() => toggleChip(field)}
				>
					<svg class="chip-icon" viewBox="0 0 24 24" fill="currentColor">
						<path d={path} />
					</svg>
					<span>{label}</span>
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
				<label class="field-label field-label-icon" for="cost_heat">
					<svg class="cost-icon icon-heat" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2.1c1.07 3.13 4.8 4.7 4.8 8.4 0 3.09-2.51 5.6-5.6 5.6S5.6 13.59 5.6 10.5c0-3.7 3.73-5.27 4.8-8.4zm0 6.4c-.45 1.3-2 1.95-2 3.5 0 1.1.9 2 2 2s2-.9 2-2c0-1.55-1.55-2.2-2-3.5z" />
					</svg>
					Heat
				</label>
				<input type="number" id="cost_heat" bind:value={record.cost_heat} />
			</div>
			<div class="field">
				<label class="field-label field-label-icon" for="cost_water">
					<svg class="cost-icon icon-water" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
					</svg>
					Water
				</label>
				<input type="number" id="cost_water" bind:value={record.cost_water} />
			</div>
			<div class="field">
				<label class="field-label field-label-icon" for="cost_power">
					<svg class="cost-icon icon-power" viewBox="0 0 24 24" fill="currentColor">
						<path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .78.33.69.83L11 21z" />
					</svg>
					Power
				</label>
				<input type="number" id="cost_power" bind:value={record.cost_power} />
			</div>
			<div class="field">
				<label class="field-label field-label-icon" for="cost_internet">
					<svg class="cost-icon icon-internet" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 6c-2.48 0-4.74.88-6.51 2.33L12 19.12l6.51-6.79C16.74 10.88 14.48 10 12 10z" />
					</svg>
					Internet
				</label>
				<input type="number" id="cost_internet" bind:value={record.cost_internet} />
			</div>
			<div class="field">
				<label class="field-label field-label-icon" for="cost_laundry">
					<svg class="cost-icon icon-laundry" viewBox="0 0 24 24" fill="currentColor">
						<path d="M18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM10 4h4v2h-4V4zm2 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
					</svg>
					Laundry
				</label>
				<input type="number" id="cost_laundry" bind:value={record.cost_laundry} />
			</div>
			<div class="field">
				<label class="field-label field-label-icon" for="cost_parking">
					<svg class="cost-icon icon-parking" viewBox="0 0 24 24" fill="currentColor">
						<path d="M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 7H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z" />
					</svg>
					Parking
				</label>
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

<style>
	/* Enhanced Chip styling */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted);
		user-select: none;
		transition: all 0.15s ease;
		font-family: var(--sans);
	}

	.chip-icon {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		fill: currentColor;
		opacity: 0.7;
		transition: opacity 0.15s ease;
	}

	.chip.active {
		border-color: var(--accent);
		background: rgba(124, 156, 255, 0.12);
		color: var(--accent);
	}

	.chip.active .chip-icon {
		opacity: 1;
	}

	/* Field Label with Icons for Monthly Costs */
	.field-label-icon {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.cost-icon {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		fill: currentColor;
		opacity: 0.8;
	}

	.icon-heat {
		color: #f85149;
	}

	.icon-water {
		color: #38bdf8;
	}

	.icon-power {
		color: #d29922;
	}

	.icon-internet {
		color: #7c9cff;
	}

	.icon-laundry {
		color: #a855f7;
	}

	.icon-parking {
		color: #3fb950;
	}

	.cost-other {
		margin-top: 14px;
	}

	.form-actions {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;
		margin-top: 20px;
	}

	.form-actions .btn-secondary,
	.form-actions .btn-submit {
		flex: 1;
		margin: 0;
		white-space: nowrap;
	}

	/* Custom Datetime Input Styling */
.custom-datetime-wrapper {
	display: flex;
	align-items: center;
	position: relative;
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 8px;
	padding: 0 10px;
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.custom-datetime-wrapper:focus-within {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px rgba(124, 156, 255, 0.2);
}

.custom-datetime-wrapper.input-error {
	border-color: var(--red);
}

.datetime-icon {
	width: 18px;
	height: 18px;
	fill: var(--accent);
	flex-shrink: 0;
	margin-right: 8px;
	pointer-events: none;
}

.styled-datetime-input {
	flex: 1;
	background: transparent;
	border: none;
	outline: none;
	color: var(--text);
	font-family: inherit;
	font-size: 13px;
	padding: 8px 0;
	color-scheme: dark; /* Forces native mobile date pickers to open in dark mode */
}

/* Customizing standard calendar indicator icon in WebKit engines */
.styled-datetime-input::-webkit-calendar-picker-indicator {
	cursor: pointer;
	filter: invert(0.8);
	opacity: 0.6;
	transition: opacity 0.15s ease;
}

.styled-datetime-input::-webkit-calendar-picker-indicator:hover {
	opacity: 1;
}

.btn-clear-date {
	background: transparent;
	border: none;
	color: var(--muted);
	font-size: 12px;
	padding: 4px 6px;
	cursor: pointer;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.btn-clear-date:hover {
	color: var(--red);
	background: rgba(248, 81, 73, 0.1);
}

</style>