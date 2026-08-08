export function formatMoney(n) {
	return `$${Math.round(n)}`;
}

export function formatDate(iso) {
	if (!iso) return '—';
	const d = new Date(iso.replace(' ', 'T'));
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso) {
	if (!iso) return '—';
	const d = new Date(iso.replace(' ', 'T'));
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

// Countdown string for a target datetime (past or future)
export function formatCountdown(iso) {
	if (!iso) return null;
	const normalized = typeof iso === 'string' ? iso.trim().replace(' ', 'T') : iso;
	const target = new Date(normalized).getTime();
	if (Number.isNaN(target)) return null;

	const diff = target - Date.now();
	if (diff <= 0) {
		const pastMs = Math.abs(diff);
		const days = Math.floor(pastMs / 86400000);
		const hours = Math.floor((pastMs % 86400000) / 3600000);
		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		return `just now`;
	}

	const days = Math.floor(diff / 86400000);
	const hours = Math.floor((diff % 86400000) / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);

	if (days > 0) return `in ${days}d ${hours}h`;
	if (hours > 0) return `in ${hours}h ${minutes}m`;
	return `in ${Math.max(1, minutes)}m`;
}

export function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Linkify only literal tel:/mailto: prefixes the user typed themselves —
// no guessing at phone numbers or emails buried in free text (task 11).
export function linkifyContact(text) {
	if (!text) return '';
	const escaped = escapeHtml(text);
	return escaped.replace(
		/(tel:[+0-9().\-\s]+|mailto:[^\s<]+)/g,
		(match) => `<a href="${match.trim()}">${match}</a>`
	);
}
