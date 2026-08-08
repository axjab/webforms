import { browser } from '$app/environment';

const STORAGE_KEY = 'casa_auth';

// Shared reactive auth state — every component that imports `auth` sees the
// same live object, so signing in/out from anywhere updates the whole app.
export const auth = $state({ token: null, user: null });

function persist() {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: auth.token, user: auth.user }));
	} catch {
		// localStorage unavailable (private browsing, quota, etc.) — session
		// just won't survive a page refresh.
	}
}

export function setAuth(token, user) {
	auth.token = token;
	auth.user = user;
	persist();
}

export function clearAuth() {
	auth.token = null;
	auth.user = null;
	if (browser) {
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// ignore
		}
	}
}

export function loadPersistedAuth() {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
