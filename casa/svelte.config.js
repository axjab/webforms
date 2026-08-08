import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // Enables SPA client-side routing for Caddy
			precompress: false,
			strict: true
		})
	}
};

export default config;
