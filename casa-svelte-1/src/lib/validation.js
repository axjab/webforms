
/**
 * Validates listing URL structure
 */
export function validateUrl(url) {
	if (!url || !url.trim()) {
		return { valid: false, message: 'Listing URL is required.' };
	}

	const trimmed = url.trim();
	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return { valid: false, message: 'URL must start with http:// or https://' };
		}
		if (!parsed.hostname || parsed.hostname.length < 2) {
			return { valid: false, message: 'URL must include valid host text.' };
		}
		return { valid: true, message: '' };
	} catch {
		return { valid: false, message: 'Invalid URL format (e.g. https://rentals.ca/property).' };
	}
}

/**
 * Validates tour date is not in the past
 */
export function validateTourDate(tourDate) {
	if (!tourDate) return { valid: true, message: '' };
	const parsed = new Date(tourDate);
	if (Number.isNaN(parsed.getTime())) {
		return { valid: false, message: 'Invalid tour date format.' };
	}
	if (parsed < new Date()) {
		return { valid: false, message: 'Tour date cannot be in the past.' };
	}
	return { valid: true, message: '' };
}

/**
 * Consolidates all form field validation
 */
export function validateRecord(record) {
	const errors = [];

	if (!record.address || !record.address.trim()) {
		errors.push('Address is required.');
	}

	if (record.cost_base === '' || record.cost_base === null || record.cost_base === undefined) {
		errors.push('Base cost is required.');
	}

	const urlCheck = validateUrl(record.url);
	if (!urlCheck.valid) {
		errors.push(urlCheck.message);
	}

	const tourCheck = validateTourDate(record.tour_date);
	if (!tourCheck.valid) {
		errors.push(tourCheck.message);
	}

	return { valid: errors.length === 0, errors };
}

export function validateForCreate(payload) {
	return validateRecord(payload);
}

export function validateForUpdate(payload, id) {
	return validateRecord(payload);
}
