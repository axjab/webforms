<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatDateTime, formatCountdown } from '$lib/format.js';

	let { record, onView, onEdit, onDelete } = $props();

	const total = $derived(recordTotal(record));
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	// Comprehensive date and countdown calculation for SCHEDULED cards
	const countdownInfo = $derived.by(() => {
		if (record.status !== 'SCHEDULED') return null;
		if (!record.tour_date) return { dateStr: 'No date set', remaining: null };
		const dateStr = formatDateTime(record.tour_date);
		const remaining = formatCountdown(record.tour_date);
		return { dateStr, remaining };
	});

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

<div
	class="property-card"
	class:scheduled={record.status === 'SCHEDULED'}
	class:queued={record.status === 'QUEUED'}
	class:accepted={record.status === 'ACCEPTED'}
	class:rejected={isRejected}
>
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

	{#if record.status === 'SCHEDULED' && countdownInfo}
		<div class="property-card-countdown-badge">
			<span>⏳ Tour: {countdownInfo.dateStr}</span>
			{#if countdownInfo.remaining}
				<span class="countdown-time">({countdownInfo.remaining})</span>
			{/if}
		</div>
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
	/* --- Status Styles --- */
	.property-card.scheduled {
		border-left: 4px solid #2563eb;
		background-color: rgba(37, 99, 235, 0.04);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
	}

	.property-card.accepted {
		border-left: 4px solid #16a34a;
		background-color: rgba(22, 163, 74, 0.05);
	}

	.property-card.rejected {
		opacity: 0.5;
		text-decoration: line-through;
	}

	.property-card.rejected .property-card-actions {
		text-decoration: none;
	}

	/* --- Countdown Badge --- */
	.property-card-countdown-badge {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		background-color: #2563eb;
		color: #ffffff;
		font-weight: 600;
		font-size: 0.8rem;
		padding: 0.3rem 0.65rem;
		border-radius: 8px;
		margin: 0.4rem 0;
		width: fit-content;
	}

	.countdown-time {
		opacity: 0.9;
		font-weight: 400;
	}

	/* --- GO Button --- */
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