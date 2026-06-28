import type { MetadataRoute } from 'next';
import { APP_URL, absoluteUrl } from '@/lib/url';

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date();

	return [
		// --- Marketing routes (high SEO value) ---
		{ url: APP_URL, lastModified, changeFrequency: 'monthly', priority: 1 },
		{ url: absoluteUrl('/features'), lastModified, changeFrequency: 'monthly', priority: 0.9 },
		{ url: absoluteUrl('/invoicing'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
		{ url: absoluteUrl('/how-it-works'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
		{ url: absoluteUrl('/pricing'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
		{ url: absoluteUrl('/faq'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
		{ url: absoluteUrl('/ai-advisor'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
		// --- Changelog (content hub, crawlable) ---
		{ url: absoluteUrl('/changelog'), lastModified, changeFrequency: 'weekly', priority: 0.6 },
		// NOTE: /register and /login intentionally omitted — thin auth pages with no organic value.
	];
}
