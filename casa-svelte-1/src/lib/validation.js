// Extend these as rules are defined later. Both must return
// { valid: boolean, errors: string[] }. Left as no-ops on purpose —
// this mirrors the original app, which only enforced address/cost_base
// directly in the submit handler.

export function validateForCreate(payload) {
	// TODO: add create-specific validation rules here
	return { valid: true, errors: [] };
}

export function validateForUpdate(payload, id) {
	// TODO: add update-specific validation rules here
	return { valid: true, errors: [] };
}
