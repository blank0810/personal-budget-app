import type { MetadataRoute } from 'next';
import { getSeoUrls } from '@/lib/seo-urls';
import { absoluteUrl } from '@/lib/url';

export default function sitemap(): MetadataRoute.Sitemap {
	return getSeoUrls().map((url) => ({
		url: absoluteUrl(url.path),
		lastModified: url.lastModified,
		changeFrequency: url.changeFrequency,
		priority: url.priority,
	}));
}
