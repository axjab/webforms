export function validateNavigationUrl(url) {
	// Null, undefined, empty, or whitespace-only values are allowed
	if (!url || typeof url !== 'string' || !url.trim()) {
		return { valid: true };
	}

	const trimmed = url.trim();
	const testUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;

	try {
		new URL(testUrl);
		return { valid: true };
	} catch {
		return { valid: false, message: 'Navigation URL must be a valid URL (e.g. https://maps.example.com)' };
	}
}

// Ensure validateRecord includes navigation_url in overall form validation
export function validateRecord(record) {
	const errors = [];

	const urlVal = validateUrl(record.url);
	if (!urlVal.valid) errors.push(urlVal.message);

	const navUrlVal = validateNavigationUrl(record.navigation_url);
	if (!navUrlVal.valid) errors.push(navUrlVal.message);

	const tourVal = validateTourDate(record.tour_date);
	if (!tourVal.valid) errors.push(tourVal.message);

	return {
		valid: errors.length === 0,
		errors
	};
}

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

export function validateForCreate(payload) {
	return validateRecord(payload);
}

export function validateForUpdate(payload, id) {
	return validateRecord(payload);
}