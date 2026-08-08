// Hardcoded reference point for distance_from_ref (see SPEC.md, task 7).
const REF = { lat: 45.29803797253851, lon: -75.91102934582861 };

/**
 * Extracts "lat,lon" string from various map URL formats (Google Maps, Apple Maps, OpenStreetMap, HERE WeGo).
 * @param {string} url
 * @returns {string|null} - e.g. "45.4231,-75.6892" or null if unparseable
 */
export function extractCoordsFromUrl(url) {
	if (!url || typeof url !== 'string') return null;
	const trimmed = url.trim();
	if (!trimmed) return null;

	// Google Maps @lat,lon
	const googleAtMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
	if (googleAtMatch) return `${googleAtMatch[1]},${googleAtMatch[2]}`;

	// OpenStreetMap /#map=zoom/lat/lon
	const osmMatch = trimmed.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
	if (osmMatch) return `${osmMatch[1]},${osmMatch[2]}`;

	// HERE WeGo explicit parameters
	const hereMatch = trimmed.match(/(?:map=|Location:|=|s-|r\/)(-?\d+\.\d+)%2C(-?\d+\.\d+)/i);
	if (hereMatch) return `${hereMatch[1]},${hereMatch[2]}`;

	// Generic query parameter / path lat,lon pattern
	const genericMatch = trimmed.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
	if (genericMatch) return `${genericMatch[1]},${genericMatch[2]}`;

	return null;
}

/**
 * Converts a street address into "lat,lon" coordinates using OpenStreetMap Nominatim.
 * @param {string} address - e.g. "443 Dawson Avenue"
 * @returns {Promise<string|null>} - e.g. "45.3852,-75.7512" or null if not found
 */
export async function geocodeAddress(address) {
	if (!address || !address.trim()) return null;

	try {
		const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
		
		const response = await fetch(endpoint, {
			headers: {
				'User-Agent': 'CasaPropertyTracker/1.0'
			}
		});

		if (!response.ok) return null;

		const data = await response.json();
		if (data && data.length > 0) {
			const { lat, lon } = data[0];
			return `${lat},${lon}`;
		}
	} catch (err) {
		console.error('Geocoding error:', err);
	}

	return null;
}

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

/**
 * Resolves navigation target URL prioritizing coordinates first,
 * falling back to navigation_url second.
 * Coordinates route through Google Maps API URL to invoke native OS app handlers.
 * 
 * @param {Object} record - Property record object containing coordinates or navigation_url
 * @returns {string|null} Cross-platform map link or null if no navigation target exists
 */
export function getNavigationUrl(record) {
	if (!record) return null;

	// 1. Coordinates First
	let coords = null;
	if (record.coordinates && typeof record.coordinates.lat === 'number' && typeof record.coordinates.lon === 'number') {
		coords = record.coordinates;
	} else if (record.coordinates_input) {
		coords = parseCoordinates(record.coordinates_input);
	}

	if (coords) {
		return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`;
	}

	// 2. Navigation URL Second
	if (record.navigation_url && typeof record.navigation_url === 'string') {
		const raw = record.navigation_url.trim();
		if (raw) {
			return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
		}
	}

	return null;
}