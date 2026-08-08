export function emptyRecord() {
	return {
		address: '',
		status: 'QUEUED',
		cost_base: '',
		cost_parking: '',
		cost_utilities: '',
		score: '',
		nabila_rating: '',
		tour_date: '',
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

	// Convert PocketBase date to HTML datetime-local input format (YYYY-MM-DDTHH:mm)
	let tourDateVal = '';
	if (record.tour_date) {
		const parsed = new Date(record.tour_date.replace(' ', 'T'));
		if (!Number.isNaN(parsed.getTime())) {
			// Local ISO string without timezone offset adjustment
			const tzOffsetMs = parsed.getTimezoneOffset() * 60000;
			const localDate = new Date(parsed.getTime() - tzOffsetMs);
			tourDateVal = localDate.toISOString().slice(0, 16);
		}
	}

	return {
		id: record.id || null,
		address: record.address || '',
		status: record.status || 'QUEUED',
		cost_base: record.cost_base ?? '',
		cost_parking: record.cost_parking ?? '',
		cost_utilities: record.cost_utilities ?? '',
		score: record.score ?? '',
		nabila_rating: record.nabila_rating ?? '',
		tour_date: tourDateVal,
		navigation_url: record.navigation_url || '',
		has_parking: Boolean(record.has_parking),
		parking_nearby: Boolean(record.parking_nearby),
		has_storage: Boolean(record.has_storage),
		has_gym: Boolean(record.has_gym),
		has_pool: Boolean(record.has_pool),
		is_furnished: Boolean(record.is_furnished),
		notes: record.notes || ''
	};
}

export function toApiPayload(formRecord) {
	const payload = {
		address: formRecord.address?.trim() || '',
		status: formRecord.status || 'QUEUED',
		cost_base: formRecord.cost_base !== '' && formRecord.cost_base !== null ? Number(formRecord.cost_base) : null,
		cost_parking: formRecord.cost_parking !== '' && formRecord.cost_parking !== null ? Number(formRecord.cost_parking) : null,
		cost_utilities: formRecord.cost_utilities !== '' && formRecord.cost_utilities !== null ? Number(formRecord.cost_utilities) : null,
		score: formRecord.score !== '' && formRecord.score !== null ? Number(formRecord.score) : null,
		nabila_rating: formRecord.nabila_rating !== '' && formRecord.nabila_rating !== null ? Number(formRecord.nabila_rating) : null,
		navigation_url: formRecord.navigation_url?.trim() || '',
		has_parking: Boolean(formRecord.has_parking),
		parking_nearby: Boolean(formRecord.parking_nearby),
		has_storage: Boolean(formRecord.has_storage),
		has_gym: Boolean(formRecord.has_gym),
		has_pool: Boolean(formRecord.has_pool),
		is_furnished: Boolean(formRecord.is_furnished),
		notes: formRecord.notes?.trim() || ''
	};

	// Convert datetime-local input string into ISO format for PocketBase persistence
	if (formRecord.tour_date) {
		const parsed = new Date(formRecord.tour_date);
		payload.tour_date = !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
	} else {
		payload.tour_date = null;
	}

	return payload;
}

/**
 * Calculates the total monthly cost for a property record
 */
export function recordTotal(record) {
	if (!record) return 0;

	const base = Number(record.cost_base) || 0;
	const parking = Number(record.cost_parking) || 0;
	const utilities = Number(record.cost_utilities) || 0;
	const heat = Number(record.cost_heat) || 0;
	const water = Number(record.cost_water) || 0;
	const power = Number(record.cost_power) || 0;
	const internet = Number(record.cost_internet) || 0;
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
