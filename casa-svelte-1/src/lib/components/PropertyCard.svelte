<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatCountdown } from '$lib/format.js';

	let { record, onView, onEdit, onDelete } = $props();

	const total = $derived(recordTotal(record));
	const countdown = $derived(record.status === 'SCHEDULED' ? formatCountdown(record.tour_date) : null);
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	// Strictly uses navigation_url only
	const goUrl = $derived.by(() => {
		if (!record.navigation_url) return null;
		const raw = record.navigation_url.trim();
		if (!raw) return null;
		return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
	});

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
		{#if goUrl}
			<a class="btn-card-action btn-card-go" href={goUrl} target="_blank" rel="noopener">
				GO ➔
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
		text-decoration: none;
	}

	/* Distinct GO button styling */
	.btn-card-action.btn-card-go {
		background-color: #2563eb;
		color: #ffffff;
		font-weight: 700;
		letter-spacing: 0.05em;
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		box-shadow: 0 2px 4px rgba(37, 99, 235, 0.25);
		transition: all 0.15s ease-in-out;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.btn-card-action.btn-card-go:hover {
		background-color: #1d4ed8;
		transform: translateY(-1px);
		box-shadow: 0 4px 6px rgba(37, 99, 235, 0.35);
	}

	.btn-card-action.btn-card-go:active {
		transform: translateY(0);
	}
</style>
