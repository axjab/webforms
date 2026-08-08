<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatCountdown } from '$lib/format.js';

	let { record, onView, onEdit, onDelete } = $props();

	const total = $derived(recordTotal(record));
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	// Extract individual countdown and date components without the year
	const countdownParts = $derived.by(() => {
		if (record.status !== 'SCHEDULED' || !record.tour_date) return null;
		const normalized = typeof record.tour_date === 'string' ? record.tour_date.trim().replace(' ', 'T') : record.tour_date;
		const d = new Date(normalized);
		if (Number.isNaN(d.getTime())) return null;

		return {
			relative: formatCountdown(record.tour_date),
			weekday: d.toLocaleDateString('en-US', { weekday: 'long' }), // e.g. Tuesday
			day: d.getDate(),                                            // e.g. 12
			month: d.toLocaleDateString('en-US', { month: 'short' }),    // e.g. Aug
			time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) // e.g. 2:30 PM
		};
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

	{#if record.status === 'SCHEDULED' && countdownParts}
		<div class="terminal-countdown-badge">
			<span class="term-prefix">> TOUR</span>
			
			<!-- 1. RELATIVE TIME (Top Emphasis: Neon, boldest, largest) -->
			{#if countdownParts.relative}
				<span class="term-relative">{countdownParts.relative}</span>
			{/if}

			<span class="term-divider">|</span>

			<!-- 2. DAY OF THE WEEK -->
			<span class="term-weekday">{countdownParts.weekday}</span>

			<!-- 3. DAY OF THE MONTH -->
			<span class="term-day">{countdownParts.day}</span>

			<!-- 4. MONTH -->
			<span class="term-month">{countdownParts.month}</span>

			<!-- Optional Time -->
			<span class="term-time">@{countdownParts.time}</span>
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
		border-left: 4px solid #00f0ff;
		background-color: rgba(0, 240, 255, 0.02);
		box-shadow: 0 4px 16px rgba(0, 240, 255, 0.08);
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

	/* --- Terminal/Neon Countdown Badge --- */
	.terminal-countdown-badge {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.45rem;
		font-family: 'JetBrains Mono', monospace, monospace;
		background: rgba(10, 15, 26, 0.75);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(0, 240, 255, 0.3);
		border-radius: 6px;
		padding: 0.35rem 0.75rem;
		margin: 0.5rem 0;
		box-shadow: 0 0 10px rgba(0, 240, 255, 0.15), inset 0 0 10px rgba(0, 240, 255, 0.05);
		letter-spacing: 0.02em;
	}

	.term-prefix {
		color: #38bdf8;
		font-size: 0.7rem;
		font-weight: 700;
		opacity: 0.8;
	}

	/* 1. RELATIVE TIME: Maximum Neon Emphasis */
	.term-relative {
		color: #00f0ff;
		font-weight: 800;
		font-size: 0.95rem;
		text-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
		text-transform: uppercase;
	}

	.term-divider {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.8rem;
	}

	/* 2. DAY OF THE WEEK */
	.term-weekday {
		color: #e2e8f0;
		font-weight: 600;
		font-size: 0.85rem;
	}

	/* 3. DAY OF THE MONTH */
	.term-day {
		color: #cbd5e1;
		font-weight: 500;
		font-size: 0.8rem;
	}

	/* 4. MONTH */
	.term-month {
		color: #94a3b8;
		font-weight: 400;
		font-size: 0.75rem;
		text-transform: uppercase;
	}

	.term-time {
		color: #64748b;
		font-size: 0.72rem;
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
