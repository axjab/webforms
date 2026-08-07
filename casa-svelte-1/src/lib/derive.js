// Hardcoded reference point for distance_from_ref (see SPEC.md, task 7).
const REF = { lat: 45.29803797253851, lon: -75.91102934582861 };

// "45.4231,-75.6892" -> { lat, lon }, or null if it doesn't parse.
export function parseCoordinates(str) {
	if (!str) return null;
	const parts = str.split(',').map((p) => p.trim());
	if (parts.length !== 2) return null;
	const lat = parseFloat(parts[0]);
	const lon = parseFloat(parts[1]);
	if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
	return { lat, lon };
}

// { lat, lon } -> "45.4231,-75.6892", for populating the form from a saved record.
export function formatCoordinates(coordinates) {
	if (!coordinates) return '';
	return `${coordinates.lat},${coordinates.lon}`;
}

// Straight-line distance in km between coordinates and the hardcoded REF point.
export function distanceFromRef(coordinates) {
	if (!coordinates) return undefined;
	const toRad = (deg) => (deg * Math.PI) / 180;
	const R = 6371;
	const dLat = toRad(coordinates.lat - REF.lat);
	const dLon = toRad(coordinates.lon - REF.lon);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(REF.lat)) * Math.cos(toRad(coordinates.lat)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Math.round(R * c * 10) / 10;
}

// status is derived, not user-editable — verdict wins first, then tour_date.
export function computeStatus(verdict, tourDate) {
	if (verdict === 'NO') return 'REJECTED';
	if (verdict === 'YES') return 'ACCEPTED';
	if (tourDate) return 'SCHEDULED';
	return 'QUEUED';
}

// App-agnostic map link — always mapfwd.com/<listing url>.
export function navigationUrl(url) {
	if (!url) return undefined;
	return `mapfwd.com/${url}`;
}
