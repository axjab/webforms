<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatDateTime, linkifyContact } from '$lib/format.js';

	let { record, onEdit, onClose } = $props();

	const total = $derived(recordTotal(record));
</script>

<div class="property-detail">
	<div class="property-detail-header">
		<h2>{record.address}</h2>
		<button type="button" class="btn-secondary" onclick={onClose}>Close</button>
	</div>

	<dl class="detail-grid">
		<dt>Status</dt>
		<dd>{record.status}</dd>

		<dt>Verdict</dt>
		<dd>{record.verdict}</dd>

		<dt>URL</dt>
		<dd>
			{#if record.url}
				<a href={record.url} target="_blank" rel="noopener">{record.url}</a>
			{:else}
				—
			{/if}
		</dd>

		<dt>Contact</dt>
		<dd>{@html linkifyContact(record.contact) || '—'}</dd>

		<dt>Coordinates</dt>
		<dd>{record.coordinates ? `${record.coordinates.lat}, ${record.coordinates.lon}` : '—'}</dd>

		<dt>Distance from ref</dt>
		<dd>{record.distance_from_ref ?? '—'} km</dd>

		<dt>Tour requested</dt>
		<dd>{record.tour_requested ? 'Yes' : 'No'}</dd>

		<dt>Tour date</dt>
		<dd>{formatDateTime(record.tour_date)}</dd>

		<dt>Move-in</dt>
		<dd>{formatDate(record.move_in)}</dd>

		<dt>Laundry</dt>
		<dd>{record.laundry_type}</dd>

		<dt>Monthly total</dt>
		<dd class="mono">{formatMoney(total)}</dd>

		<dt>Nabila's rating</dt>
		<dd>{record.nabila_rating ?? '—'}/10</dd>

		<dt>Score</dt>
		<dd>{record.score ?? '—'}</dd>
	</dl>

	{#if record.reviews}
		<details class="field-expandable">
			<summary>Reviews</summary>
			<p>{record.reviews}</p>
		</details>
	{/if}

	{#if record.notes}
		<div class="detail-notes">{@html record.notes}</div>
	{/if}

	<div class="property-detail-actions">
		<button type="button" class="btn-submit" onclick={() => onEdit(record.id)}>Edit this property</button>
	</div>
</div>
