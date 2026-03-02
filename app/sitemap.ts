import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://budgetplanner.app';

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'monthly',
			priority: 1,
		},
		{
			url: `${baseUrl}/login`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.5,
		},
		{
			url: `${baseUrl}/register`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 0.8,
		},
		{
			url: `${baseUrl}/changelog`,
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 0.6,
		},
	];
}
