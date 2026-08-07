<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatCountdown } from '$lib/format.js';

	let { record, onView, onEdit, onDelete } = $props();

	const total = $derived(recordTotal(record));
	const countdown = $derived(record.status === 'SCHEDULED' ? formatCountdown(record.tour_date) : null);
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	const badgeFields = [
		['has_parking', 'Parking'],
		['parking_nearby', 'Parking nearby'],
		['has_storage', 'Storage'],
		['has_gym', 'Gym'],
		['has_pool', 'Pool'],
		['is_furnished', 'Furnished']
	];
</script>

<div class="property-card" class:rejected={isRejected}>
	<div class="property-card-header">
		<span class="property-card-address">{record.address || 'Untitled'}</span>
		<span class="property-card-score">Score {record.score ?? '—'}</span>
	</div>
	<div class="property-card-meta">
		<span class="mono">{formatMoney(total)}/mo</span>
		<span>Rating {record.nabila_rating ?? '—'}/10</span>
		<span>{formatDate(record.created)}</span>
		<span class="property-card-status">{record.status}</span>
	</div>
	{#if countdown}
		<div class="property-card-countdown">Tour {countdown}</div>
	{/if}
	{#if badgeFields.some(([field]) => record[field])}
		<div class="property-card-badges">
			{#each badgeFields as [field, label]}
				{#if record[field]}
					<span class="property-card-badge">{label}</span>
				{/if}
			{/each}
		</div>
	{/if}
	<div class="property-card-actions">
		<button type="button" class="btn-card-action" onclick={() => onView(record.id)}>View</button>
		<button type="button" class="btn-card-action" onclick={() => onEdit(record.id)}>Edit</button>
		{#if record.navigation_url}
			<a class="btn-card-action" href={`https://${record.navigation_url}`} target="_blank" rel="noopener">
				GO
			</a>
		{/if}
		<button type="button" class="btn-card-action btn-card-delete" onclick={() => onDelete(record.id)}>
			Delete
		</button>
	</div>
</div>

<style>
	.property-card.rejected {
		opacity: 0.5;
		text-decoration: line-through;
	}

	.property-card.rejected .property-card-actions {
		text-decoration: none; /* Keeps action buttons legible */
	}
</style>
