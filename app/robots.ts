import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/url';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/dashboard', '/admin', '/api/', '/onboarding', '/forgot-password', '/reset-password'],
			},
		],
		sitemap: absoluteUrl('/sitemap.xml'),
	};
}
