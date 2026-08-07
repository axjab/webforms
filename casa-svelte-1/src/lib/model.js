import { parseCoordinates, formatCoordinates, distanceFromRef, computeStatus, navigationUrl } from './derive.js';

// Default values for a brand-new entry — same defaults as the original app.
export function emptyRecord() {
	return {
		id: null,
		address: '',
		url: '',
		contact: '',
		coordinates_input: '', // single "lat,lon" text field (task 1)
		verdict: 'UNDECIDED',
		tour_requested: false,
		tour_date: '', // datetime-local string
		has_parking: false,
		parking_nearby: false,
		has_storage: false,
		has_gym: false,
		has_pool: false,
		is_furnished: false,
		laundry_type: 'coin-operated',
		cost_base: '',
		cost_heat: 80,
		cost_water: 0,
		cost_power: 80,
		cost_internet: 65,
		cost_laundry: 35,
		cost_parking: 0,
		cost_other: [], // [{ label, amount }] — converted to/from a map at the API boundary
		reviews: '',
		notes: '',
		nabila_rating: '',
		move_in: '', // date-only string
		score: undefined, // read-only, server-computed
		distance_from_ref: undefined // read-only, computed below
	};
}

// PocketBase record -> flat UI shape used by the form.
export function fromApiRecord(api) {
	return {
		...emptyRecord(),
		id: api.id,
		address: api.address ?? '',
		url: api.url ?? '',
		contact: api.contact ?? '',
		coordinates_input: formatCoordinates(api.coordinates),
		verdict: api.verdict ?? 'UNDECIDED',
		tour_requested: !!api.tour_requested,
		tour_date: api.tour_date ?? '',
		has_parking: !!api.has_parking,
		parking_nearby: !!api.parking_nearby,
		has_storage: !!api.has_storage,
		has_gym: !!api.has_gym,
		has_pool: !!api.has_pool,
		is_furnished: !!api.is_furnished,
		laundry_type: api.laundry_type || 'coin-operated',
		cost_base: api.cost_base ?? '',
		cost_heat: api.cost_heat ?? 0,
		cost_water: api.cost_water ?? 0,
		cost_power: api.cost_power ?? 0,
		cost_internet: api.cost_internet ?? 0,
		cost_laundry: api.cost_laundry ?? 0,
		cost_parking: api.cost_parking ?? 0,
		cost_other: Object.entries(api.cost_other || {}).map(([label, amount]) => ({ label, amount })),
		reviews: api.reviews ?? '',
		notes: api.notes ?? '',
		nabila_rating: api.nabila_rating ?? '',
		move_in: api.move_in ?? '',
		score: api.score,
		distance_from_ref: api.distance_from_ref
	};
}

// Flat UI shape -> PocketBase payload for POST/PATCH.
export function toApiPayload(record) {
	const coordinates = parseCoordinates(record.coordinates_input);
	const tourDate = record.tour_date || undefined;
	const tourRequested = tourDate ? true : !!record.tour_requested; // task 4 coupling
	const status = computeStatus(record.verdict, tourDate); // derived, not user-set

	const costOther = {};
	for (const row of record.cost_other) {
		const key = (row.label || '').trim();
		if (!key) continue;
		costOther[key] = parseFloat(row.amount) || 0;
	}

	const payload = {
		address: record.address.trim(),
		url: record.url || undefined,
		contact: record.contact || undefined,
		coordinates,
		distance_from_ref: coordinates ? distanceFromRef(coordinates) : undefined,
		navigation_url: navigationUrl(record.navigation_url),
		status,
		verdict: record.verdict,
		tour_requested: tourRequested,
		tour_date: tourDate,
		has_parking: record.has_parking,
		parking_nearby: record.parking_nearby,
		has_storage: record.has_storage,
		has_gym: record.has_gym,
		has_pool: record.has_pool,
		is_furnished: record.is_furnished,
		laundry_type: record.laundry_type,
		cost_base: parseFloat(record.cost_base) || 0,
		cost_heat: parseFloat(record.cost_heat) || 0,
		cost_water: parseFloat(record.cost_water) || 0,
		cost_power: parseFloat(record.cost_power) || 0,
		cost_internet: parseFloat(record.cost_internet) || 0,
		cost_laundry: parseFloat(record.cost_laundry) || 0,
		cost_parking: parseFloat(record.cost_parking) || 0,
		cost_other: costOther,
		reviews: record.reviews || undefined,
		notes: record.notes || undefined,
		nabila_rating: record.nabila_rating !== '' ? parseFloat(record.nabila_rating) : undefined,
		move_in: record.move_in || undefined
	};

	// drop undefined keys so a PATCH doesn't clobber fields with null
	return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

// Works on both shapes: the form's cost_other array, or the API's cost_other map.
function sumCostOther(costOther) {
	if (!costOther) return 0;
	if (Array.isArray(costOther)) {
		return costOther.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
	}
	return Object.values(costOther).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
}

export function recordTotal(record) {
	const fields = [
		'cost_base',
		'cost_heat',
		'cost_water',
		'cost_power',
		'cost_internet',
		'cost_laundry',
		'cost_parking'
	];
	const base = fields.reduce((sum, key) => sum + (parseFloat(record[key]) || 0), 0);
	return base + sumCostOther(record.cost_other);
}
