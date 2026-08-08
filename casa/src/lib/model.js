
export function emptyRecord() {
	return {
		address: '',
		url: '',
		status: 'QUEUED',
		verdict: 'UNDECIDED',
		cost_base: '',
		cost_parking: '',
		cost_utilities: '',
		cost_heat: '',
		cost_water: '',
		cost_power: 60,
		cost_internet: 40,
		cost_laundry: 35,
		cost_other: [],
		score: '',
		tour_date: '',
		tour_requested: false,
		navigation_url: '',
		has_parking: false,
		parking_nearby: false,
		has_storage: false,
		has_gym: false,
		has_pool: false,
		is_furnished: false,
		notes: ''
	};
}

export function fromApiRecord(record) {
	if (!record) return emptyRecord();

	let tourDateVal = '';
	if (record.tour_date) {
		const parsed = new Date(record.tour_date.replace(' ', 'T'));
		if (!Number.isNaN(parsed.getTime())) {
			const tzOffsetMs = parsed.getTimezoneOffset() * 60000;
			const localDate = new Date(parsed.getTime() - tzOffsetMs);
			tourDateVal = localDate.toISOString().slice(0, 16);
		}
	}

	return {
		id: record.id || null,
		address: record.address || '',
		url: record.url || '',
		status: record.status || 'QUEUED',
		verdict: record.verdict || 'UNDECIDED',
		cost_base: record.cost_base ?? '',
		cost_parking: record.cost_parking ?? '',
		cost_utilities: record.cost_utilities ?? '',
		cost_heat: record.cost_heat ?? '',
		cost_water: record.cost_water ?? '',
		cost_power: record.cost_power ?? '',
		cost_internet: record.cost_internet ?? 40,
		cost_laundry: record.cost_laundry ?? '',
		cost_other: Array.isArray(record.cost_other) ? record.cost_other : [],
		score: record.score ?? '',
		tour_date: tourDateVal,
		tour_requested: Boolean(record.tour_requested),
		navigation_url: record.navigation_url || '',
		coordinates_input: record.coordinates ? `${record.coordinates.lat},${record.coordinates.lon}` : '',
		laundry_type: record.laundry_type || '',
		move_in: record.move_in || '',
		contact: record.contact || '',
		reviews: record.reviews || '',
		has_parking: Boolean(record.has_parking),
		parking_nearby: Boolean(record.parking_nearby),
		has_storage: Boolean(record.has_storage),
		has_gym: Boolean(record.has_gym),
		has_pool: Boolean(record.has_pool),
		is_furnished: Boolean(record.is_furnished),
		notes: record.notes || ''
	};
}

// $lib/model.js
export function toApiPayload(record) {
    const numericFields = ['cost_base', 'cost_heat', 'cost_water', 'cost_power', 'cost_parking', 'cost_utilities', 'score', 'distance_from_ref'];
    
    const payload = { ...record };

    // Convert empty strings on numeric fields to null
    for (const field of numericFields) {
        if (payload[field] === '' || payload[field] === undefined) {
            payload[field] = null;
        } else if (payload[field] !== null) {
            payload[field] = Number(payload[field]);
        }
    }

    // Ensure coordinates match PocketBase JSON/Object structure
    if (typeof payload.coordinates === 'string') {
        try {
            payload.coordinates = JSON.parse(payload.coordinates);
        } catch {
            payload.coordinates = { lat: 0, lon: 0 };
        }
    }

    return payload;
}

export function recordTotal(record) {
	if (!record) return 0;

	const base = Number(record.cost_base) || 0;
	const parking = Number(record.cost_parking) || 0;
	const utilities = Number(record.cost_utilities) || 0;
	const heat = Number(record.cost_heat) || 0;
	const water = Number(record.cost_water) || 0;
	const power = Number(record.cost_power) || 0;
	const internet = record.cost_internet !== undefined && record.cost_internet !== '' ? Number(record.cost_internet) : 40;
	const laundry = Number(record.cost_laundry) || 0;

	let otherTotal = 0;
	if (Array.isArray(record.cost_other)) {
		otherTotal = record.cost_other.reduce(
			(sum, item) => sum + (Number(item?.amount) || 0),
			0
		);
	}

	return base + parking + utilities + heat + water + power + internet + laundry + otherTotal;
}
