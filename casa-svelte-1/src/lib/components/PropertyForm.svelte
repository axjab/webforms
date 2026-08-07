<script>
	import { recordTotal } from '$lib/model.js';
	import { computeStatus, parseCoordinates, distanceFromRef } from '$lib/derive.js';
	import { formatMoney } from '$lib/format.js';

	// `record` is a Svelte 5 $state object owned by the parent page — we mutate
	// its fields directly and the parent sees the changes immediately, no
	// event dispatching needed.
	let { record, editingId = null, submitLabel = 'Save property', onSubmit, onCancel } = $props();

	const total = $derived(recordTotal(record));
	const liveDistance = $derived.by(() => {
		const coords = parseCoordinates(record.coordinates_input);
		return coords ? distanceFromRef(coords) : undefined;
	});
	const liveStatus = $derived(computeStatus(record.verdict, record.tour_date));

	function toggleChip(field) {
		record[field] = !record[field];
	}

	function addCostOtherRow() {
		record.cost_other = [...record.cost_other, { label: '', amount: '' }];
	}

	function removeCostOtherRow(index) {
		record.cost_other = record.cost_other.filter((_, i) => i !== index);
	}
</script>

<div class="view-form active">
	<!-- IDENTITY ─────────────────────────────────────── -->
	<section class="section">
		<div class="section-label">Identity</div>
		<div class="field">
			<label class="field-label" for="address">Address <span class="req">*</span></label>
			<input type="text" id="address" placeholder="44 Ontario Street, Ottawa" bind:value={record.address} />
		</div>
		<div class="field">
			<label class="field-label" for="cost_base">Base cost <span class="req">*</span></label>
			<input type="number" id="cost_base" placeholder="0" bind:value={record.cost_base} />
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="url">URL</label>
				<input type="url" id="url" placeholder="https://rentals.ca/…" bind:value={record.url} />
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

	<!-- LOCATION ─────────────────────────────────────── -->
		<section class="section">
		<div class="section-label">Location</div>
		<div class="field">
			<label class="field-label" for="navigation_url">Navigation URL</label>
			<input
				type="text"
				id="navigation_url"
				placeholder="mapfwd.com/https://rentals.ca/…"
				bind:value={record.navigation_url}
			/>
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
				<label class="field-label" for="tour_date">Tour date</label>
				<input type="datetime-local" id="tour_date" bind:value={record.tour_date} />
			</div>
			<div class="field">
				<span class="field-label">Tour requested</span>
				<label class="checkbox-inline">
					<input type="checkbox" bind:checked={record.tour_requested} disabled={!!record.tour_date} />
					{record.tour_date ? 'Yes (forced by tour date)' : 'No'}
				</label>
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
			{#each record.cost_other as row, i}
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
		<div class="section-label">Evaluation</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="verdict">Verdict</label>
				<select id="verdict" bind:value={record.verdict}>
					<option value="UNDECIDED">Undecided</option>
					<option value="YES">Yes</option>
					<option value="NO">No</option>
					<option value="MAYBE">Maybe</option>
				</select>
			</div>
			<div class="field">
				<label class="field-label" for="status_derived">Status (derived)</label>
				<input type="text" id="status_derived" value={liveStatus} disabled />
			</div>
		</div>
		<div class="grid-2">
			<div class="field">
				<label class="field-label" for="nabila_rating">Nabila's rating (1–10)</label>
				<input type="number" id="nabila_rating" min="1" max="10" placeholder="—" bind:value={record.nabila_rating} />
			</div>
			<div class="field">
				<label class="field-label" for="score_readonly">Score (read-only)</label>
				<input type="text" id="score_readonly" value={record.score ?? '—'} disabled />
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

	<!-- SUBMIT ───────────────────────────────────────── -->
	<div class="form-actions">
		{#if editingId}
			<button type="button" class="btn-secondary" onclick={onCancel}>Cancel edit</button>
		{/if}
		<button
			type="button"
			class="btn-submit"
			class:dry-run={submitLabel.startsWith('⚠')}
			onclick={onSubmit}
		>
			{submitLabel}
		</button>
	</div>
</div>
