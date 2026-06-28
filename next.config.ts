import type { NextConfig } from 'next';

/** Baseline security headers applied to every route (HSTS is set at the proxy). */
const securityHeaders = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=()',
	},
];

const nextConfig: NextConfig = {
	/* config options here */
	output: 'standalone',
	reactCompiler: true,
	async headers() {
		return [{ source: '/:path*', headers: securityHeaders }];
	},
};

export default nextConfig;
