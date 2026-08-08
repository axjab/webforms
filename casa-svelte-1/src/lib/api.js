export const BASE_URL = 'https://api.alj.cx';
export const AUTH_IDENTITY = 'x@alj.cx'; // only user — hardcoded per spec, safe to expose

async function parseJson(res) {
	try {
		return await res.json();
	} catch {
		return {};
	}
}

export async function loginRequest(password) {
	const res = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ identity: AUTH_IDENTITY, password })
	});
	const data = await parseJson(res);
	if (!res.ok) throw new Error(data.message || 'Authentication failed');
	return data; // { token, record }
}

export async function refreshRequest(token) {
	const res = await fetch(`${BASE_URL}/api/collections/users/auth-refresh`, {
		method: 'POST',
		headers: { Authorization: token }
	});
	const data = await parseJson(res);
	if (!res.ok) throw new Error(data.message || 'Session expired');
	return data; // { token, record }
}

export async function fetchRecords(token) {
	const res = await fetch(`${BASE_URL}/api/collections/casa_properties/records?sort=-created`, {
		headers: { Authorization: token }
	});
	const data = await parseJson(res);
	if (!res.ok) throw new Error(data.message || 'Failed to load listings');
	return data; // { items, totalItems, ... }
}

export async function createRecord(token, payload) {
	const res = await fetch(`${BASE_URL}/api/collections/casa_properties/records`, {
		method: 'POST',
		headers: { 
			'Content-Type': 'application/json', 
			Authorization: token 
		},
		body: JSON.stringify(payload)
	});

	const data = await parseJson(res);

	if (!res.ok) {
		// Extract nested field errors if present, otherwise stringify the whole response body
		const serverDetails = data?.data && Object.keys(data.data).length > 0
			? JSON.stringify(data.data, null, 2)
			: JSON.stringify(data, null, 2);

		const errorMessage = `${data?.message || 'Create failed'}\n\nServer Response:\n${serverDetails}`;
		throw new Error(errorMessage);
	}

	return data;
}

export async function updateRecord(token, id, payload) {
	const res = await fetch(`${BASE_URL}/api/collections/casa_properties/records/${id}`, {
		method: 'PATCH',
		headers: { 
			'Content-Type': 'application/json', 
			Authorization: token 
		},
		body: JSON.stringify(payload)
	});

	const data = await parseJson(res);

	if (!res.ok) {
		const serverDetails = data?.data && Object.keys(data.data).length > 0
			? JSON.stringify(data.data, null, 2)
			: JSON.stringify(data, null, 2);

		const errorMessage = `${data?.message || 'Update failed'}\n\nServer Response:\n${serverDetails}`;
		throw new Error(errorMessage);
	}

	return data;
}

export async function deleteRecord(token, id) {
	const res = await fetch(`${BASE_URL}/api/collections/casa_properties/records/${id}`, {
		method: 'DELETE',
		headers: { Authorization: token }
	});
	if (!res.ok && res.status !== 204) {
		const data = await parseJson(res);
		throw new Error(data.message || 'Delete failed');
	}
}
