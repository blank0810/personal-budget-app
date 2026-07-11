import { ChangelogService } from '@/server/modules/changelog/changelog.service';

export type SeoUrl = {
	path: string;
	lastModified: Date;
	changeFrequency: 'yearly' | 'monthly' | 'weekly' | 'daily';
	priority: number;
};

// The public marketing site was last redesigned in changelog v2.1. Bump this only when the marketing pages' content actually changes.
export const MARKETING_LAST_MODIFIED = new Date('2026-06-28');

export function getSeoUrls(): SeoUrl[] {
	const marketingUrls: SeoUrl[] = [
		{ path: '/', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 1 },
		{ path: '/features', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.9 },
		{ path: '/invoicing', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.8 },
		{ path: '/how-it-works', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.8 },
		{ path: '/pricing', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.8 },
		{ path: '/faq', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.8 },
		{ path: '/ai-advisor', lastModified: MARKETING_LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.7 },
	];

	return [
		...marketingUrls,
		{
			path: '/changelog',
			lastModified: ChangelogService.getLatestDate() ?? MARKETING_LAST_MODIFIED,
			changeFrequency: 'weekly',
			priority: 0.6,
		},
		...ChangelogService.getSitemapEntries().map(({ version, date }) => ({
			path: `/changelog/${version}`,
			lastModified: date,
			changeFrequency: 'yearly' as const,
			priority: 0.5,
		})),
	];
}
