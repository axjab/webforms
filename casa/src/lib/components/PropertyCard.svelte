<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatDateTime, formatCountdown, linkifyContact } from '$lib/format.js';
	import { getNavigationUrl } from '$lib/derive.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} record
	 * @property {(id: string) => void} [onView]
	 * @property {(id: string) => void} [onEdit]
	 * @property {(id: string) => void} [onDelete]
	 */

	/** @type {Props} */
	let { record, onView, onEdit, onDelete } = $props();

	// Local expansion state for inline detail toggling
	let isExpanded = $state(false);

	const total = $derived(recordTotal(record));
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	// Extract countdown and date components
	const countdownParts = $derived.by(() => {
		if (record.status !== 'SCHEDULED' || !record.tour_date) return null;
		const normalized = typeof record.tour_date === 'string' ? record.tour_date.trim().replace(' ', 'T') : record.tour_date;
		const d = new Date(normalized);
		if (Number.isNaN(d.getTime())) return null;

		return {
			relative: formatCountdown(record.tour_date),
			weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
			day: d.getDate(),
			month: d.toLocaleDateString('en-US', { month: 'short' }),
			time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		};
	});

	// Derived navigation URL prioritizes coordinates over navigation_url
	const goUrl = $derived(getNavigationUrl(record));

	const badgeFields = [
		['has_parking', 'Parking'],
		['parking_nearby', 'Parking nearby'],
		['has_storage', 'Storage'],
		['has_gym', 'Gym'],
		['has_pool', 'Pool'],
		['is_furnished', 'Furnished']
	];

	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div
	class="property-card"
	class:scheduled={record.status === 'SCHEDULED'}
	class:queued={record.status === 'QUEUED'}
	class:accepted={record.status === 'ACCEPTED'}
	class:rejected={isRejected}
	class:expanded={isExpanded}
>
	<div class="property-card-header" onclick={toggleExpand} role="button" tabindex="0">
		<span class="property-card-address">{record.address || 'Untitled'}</span>
		<span class="property-card-score">Score {record.score ?? '—'}</span>
	</div>

	<div class="property-card-meta">
		<span class="mono">
			{#if record.cost_base != null && record.cost_base !== ''}
				{formatMoney(record.cost_base)} base /
			{/if}
			{formatMoney(total)} total
		</span>
		<span>{formatDate(record.created)}</span>
		<span class="property-card-status">{record.status}</span>
	</div>

	{#if record.status === 'SCHEDULED' && countdownParts}
		<div class="terminal-countdown-badge">
			<span class="term-prefix">> TOUR</span>
			
			{#if countdownParts.relative}
				<span class="term-relative">{countdownParts.relative}</span>
			{/if}

			<span class="term-divider">|</span>
			<span class="term-weekday">{countdownParts.weekday}</span>
			<span class="term-day">{countdownParts.day}</span>
			<span class="term-month">{countdownParts.month}</span>
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

	<!-- INLINE EXPANDED DETAILS -->
	{#if isExpanded}
		<div class="property-card-expanded">
			<dl class="detail-grid">
				<dt>Status</dt>
				<dd>{record.status}</dd>

				<dt>Verdict</dt>
				<dd>{record.verdict ?? '—'}</dd>

				<dt>Base cost</dt>
				<dd class="mono">{record.cost_base != null && record.cost_base !== '' ? formatMoney(record.cost_base) : '—'}</dd>

				<dt>Monthly total</dt>
				<dd class="mono">{formatMoney(total)}</dd>

				<dt>URL</dt>
				<dd>
					{#if record.url}
						<a href={record.url} target="_blank" rel="noopener">Listing Link</a>
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
				<dd>{record.laundry_type ?? '—'}</dd>

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
		</div>
	{/if}

	<div class="property-card-actions">
		<button type="button" class="btn-card-action" onclick={toggleExpand}>
			{isExpanded ? 'Collapse ▲' : 'View ▼'}
		</button>
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
	.property-card-header {
		cursor: pointer;
		user-select: none;
	}

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
		opacity: 0.55;
	}

	.property-card.rejected .property-card-address {
		text-decoration: line-through;
	}

	/* --- Compact Terminal/Neon Countdown Badge --- */
	.terminal-countdown-badge {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem;
		font-family: 'JetBrains Mono', monospace;
		background: rgba(10, 15, 26, 0.65);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(0, 240, 255, 0.3);
		border-radius: 5px;
		padding: 0.2rem 0.5rem;
		margin: 0.25rem 0;
		box-shadow: 0 0 8px rgba(0, 240, 255, 0.12), inset 0 0 6px rgba(0, 240, 255, 0.04);
		letter-spacing: 0.01em;
	}

	.term-prefix {
		color: #38bdf8;
		font-size: 0.62rem;
		font-weight: 700;
		opacity: 0.85;
	}

	.term-relative {
		color: #00f0ff;
		font-weight: 800;
		font-size: 0.78rem;
		text-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
		text-transform: uppercase;
	}

	.term-divider {
		color: rgba(255, 255, 255, 0.2);
		font-size: 0.68rem;
	}

	.term-weekday {
		color: #e2e8f0;
		font-weight: 600;
		font-size: 0.72rem;
	}

	.term-day {
		color: #cbd5e1;
		font-weight: 500;
		font-size: 0.72rem;
	}

	.term-month {
		color: #94a3b8;
		font-weight: 400;
		font-size: 0.68rem;
		text-transform: uppercase;
	}

	.term-time {
		color: #64748b;
		font-size: 0.68rem;
	}

	/* --- Expanded Details Section --- */
	.property-card-expanded {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.4rem 1rem;
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}

	.detail-grid dt {
		font-weight: 600;
		opacity: 0.7;
	}

	.detail-grid dd {
		margin: 0;
	}

	.detail-notes {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		font-size: 0.85rem;
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