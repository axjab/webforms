```markdown
# Comprehensive Development Context & Handoff Specification

## 1. Project Architecture & Environment
- **Framework:** Svelte 5 (utilizing Svelte 5 runes exclusively: `$state`, `$derived`, `$derived.by`, `$props`, `$effect`).
- **Build Tooling:** Vite with SSR enabled and PostCSS processing.
- **Backend Infrastructure:** PocketBase instance running at `https://api.alj.cx/api/collections/casa_properties/records`.
- **Styling Paradigm:** Glassmorphism with terminal/neon UI aesthetics (`JetBrains Mono` and `Inter` typography).

---

## 2. Recent Issues Resolved & Architectural Decisions

### A. SSR & Export Alignment (`src/lib/model.js`)
- **Problem:** `TypeError: (0 , ...).recordTotal is not a function` during SSR render.
- **Fix:** Ensured explicit export of `recordTotal(record)` calculation function in `src/lib/model.js`.
- **Calculation Logic:** Sums `cost_base`, `cost_parking`, `cost_utilities`, `cost_heat`, `cost_water`, `cost_power`, `cost_internet`, `cost_laundry`, and itemized array entries in `cost_other`.

### B. PostCSS @import Ordering
- **Problem:** `[vite:css][postcss] @import must precede all other statements` error on build.
- **Fix:** Placed the Google Fonts `@import url(...)` at line 1 of global stylesheets prior to any comments or variable declarations.

### C. Terminal/Neon Tour Countdown (`PropertyCard.svelte`)
- **Aesthetic:** Dark translucent glassmorphic badge (`rgba(10, 15, 26, 0.75)` backdrop blur) with cyan neon glowing accents.
- **Strict Hierarchy Order:**
  1. **RELATIVE TIME** (Top emphasis: cyan neon text shadow, e.g., `IN 2D 4H`)
  2. **Day of the week** (e.g., `Tuesday`)
  3. **Day of the month** (e.g., `12`)
  4. **Month** (e.g., `Aug`)
  *Note: Year is explicitly omitted from this display sequence.*

### D. Multi-Card Inline Expansion (ISSUE 7)
- **Problem:** Clicking a card previously navigated to a separate detail view.
- **Fix:** Converted `PropertyCard.svelte` to handle local state via `let isExpanded = $state(false)`.
- **Behavior:** Multiple property cards can now be expanded concurrently in place, rendering the full `<dl class="detail-grid">`, reviews, and HTML notes directly inside the card component.

### E. Interactive Contact Form Helper (`PropertyForm.svelte`)
- Added a `+ Add Contact` action button adjacent to the Contact field label.
- Prompts user to select between **Phone** (`1`) or **Email** (`2`).
- Formats entry automatically with required protocol prefixes (`tel:` or `mailto:`) and appends it to `record.contact`.

### F. PocketBase Schema Sanitization (400 Bad Request Fix)
- **Problem:** PocketBase strict type checks throw `400 Bad Request` if empty string (`""`) values are submitted for numeric or date/datetime fields.
- **Fix:** Implemented payload sanitization prior to `POST` or `PATCH` operations to coerce empty string inputs to `null` or explicit `Number` values.

---

## 3. Core Component Code Implementations

### A. `src/lib/components/PropertyCard.svelte`
```svelte
<script>
	import { recordTotal } from '$lib/model.js';
	import { formatMoney, formatDate, formatDateTime, formatCountdown, linkifyContact } from '$lib/format.js';

	let { record, onEdit, onDelete } = $props();

	// Local expansion state for inline detail toggling
	let isExpanded = $state(false);

	const total = $derived(recordTotal(record));
	const isRejected = $derived(record.status === 'REJECTED' || record.status === 'REJECT');

	// Extract countdown and date components without the year
	const countdownParts = $derived.by(() => {
		if (record.status !== 'SCHEDULED' || !record.tour_date) return null;
		const normalized = typeof record.tour_date === 'string' ? record.tour_date.trim().replace(' ', 'T') : record.tour_date;
		const d = new Date(normalized);
		if (Number.isNaN(d.getTime())) return null;

		return {
			relative: formatCountdown(record.tour_date),
			weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
			day: d.getDate(),
			month: d.toLocaleDateString('en-US', { month: 'short' }),
			time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		};
	});

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
		<span class="mono">{formatMoney(total)}/mo</span>
		<span>Rating {record.nabila_rating ?? '—'}/10</span>
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

	{#if isExpanded}
		<div class="property-card-expanded">
			<dl class="detail-grid">
				<dt>Status</dt><dd>{record.status}</dd>
				<dt>Verdict</dt><dd>{record.verdict ?? '—'}</dd>
				<dt>URL</dt>
				<dd>
					{#if record.url}
						<a href={record.url} target="_blank" rel="noopener">Listing Link</a>
					{:else}
						—
					{/if}
				</dd>
				<dt>Contact</dt><dd>{@html linkifyContact(record.contact) || '—'}</dd>
				<dt>Coordinates</dt><dd>{record.coordinates ? `${record.coordinates.lat}, ${record.coordinates.lon}` : '—'}</dd>
				<dt>Distance from ref</dt><dd>{record.distance_from_ref ?? '—'} km</dd>
				<dt>Tour requested</dt><dd>{record.tour_requested ? 'Yes' : 'No'}</dd>
				<dt>Tour date</dt><dd>{formatDateTime(record.tour_date)}</dd>
				<dt>Move-in</dt><dd>{formatDate(record.move_in)}</dd>
				<dt>Laundry</dt><dd>{record.laundry_type ?? '—'}</dd>
				<dt>Monthly total</dt><dd class="mono">{formatMoney(total)}</dd>
				<dt>Nabila's rating</dt><dd>{record.nabila_rating ?? '—'}/10</dd>
				<dt>Score</dt><dd>{record.score ?? '—'}</dd>
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
	.property-card.scheduled {
		border-left: 4px solid #00f0ff;
		background-color: rgba(0, 240, 255, 0.02);
		box-shadow: 0 4px 16px rgba(0, 240, 255, 0.08);
	}
	.terminal-countdown-badge {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.45rem;
		font-family: 'JetBrains Mono', monospace;
		background: rgba(10, 15, 26, 0.75);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(0, 240, 255, 0.3);
		border-radius: 6px;
		padding: 0.35rem 0.75rem;
		margin: 0.5rem 0;
		box-shadow: 0 0 10px rgba(0, 240, 255, 0.15), inset 0 0 10px rgba(0, 240, 255, 0.05);
	}
	.term-prefix { color: #38bdf8; font-size: 0.7rem; font-weight: 700; opacity: 0.8; }
	.term-relative { color: #00f0ff; font-weight: 800; font-size: 0.95rem; text-shadow: 0 0 8px rgba(0, 240, 255, 0.6); text-transform: uppercase; }
	.term-divider { color: rgba(255, 255, 255, 0.2); font-size: 0.8rem; }
	.term-weekday { color: #e2e8f0; font-weight: 600; font-size: 0.85rem; }
	.term-day { color: #cbd5e1; font-weight: 500; font-size: 0.8rem; }
	.term-month { color: #94a3b8; font-weight: 400; font-size: 0.75rem; text-transform: uppercase; }
	.term-time { color: #64748b; font-size: 0.72rem; }
	.property-card-expanded { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
	.detail-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; font-size: 0.85rem; margin-bottom: 0.75rem; }
	.detail-grid dt { font-weight: 600; opacity: 0.7; }
	.detail-grid dd { margin: 0; }
</style>

```

### B. Payload Pre-submission Sanitizer (`src/routes/+page.svelte` or Form Handler)

```javascript
export function preparePayload(record) {
	const payload = { ...record };

	const numericFields = [
		'cost_base',
		'cost_heat',
		'cost_water',
		'cost_power',
		'cost_internet',
		'cost_laundry',
		'cost_parking',
		'nabila_rating',
		'score'
	];

	for (const key of numericFields) {
		if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
			payload[key] = null;
		} else {
			payload[key] = Number(payload[key]);
		}
	}

	if (Array.isArray(payload.cost_other)) {
		payload.cost_other = payload.cost_other
			.filter((row) => row.label || row.amount)
			.map((row) => ({
				label: String(row.label || ''),
				amount: row.amount === '' ? 0 : Number(row.amount) || 0
			}));
	}

	if (!payload.tour_date) payload.tour_date = null;
	if (!payload.move_in) payload.move_in = null;

	payload.address = payload.address || '';
	payload.contact = payload.contact || '';

	return payload;
}

```

---

## 4. Instructions for Next Development Session

1. Maintain PocketBase payload sanitization (`preparePayload`) across all API interactions to prevent `400 Bad Request` responses.
2. Maintain Svelte 5 rune usage (`$state`, `$derived`, `$props`) and avoid legacy Svelte 4 reactive declarations (`$: ...`).
3. Preserve the dark/neon glassmorphic styling and terminal badge hierarchy for date and relative time metrics.