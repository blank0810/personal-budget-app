import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://budgetplanner.app';

	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/dashboard', '/admin', '/api/', '/onboarding'],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
