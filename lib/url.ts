/**
 * Canonical app origin + absolute-URL construction.
 *
 * `APP_URL` strips ANY trailing slash from `NEXT_PUBLIC_APP_URL`, so
 * `${APP_URL}/path` (and `absoluteUrl()`) can never emit a double slash.
 *
 * Why this exists: a trailing slash in the deployed `NEXT_PUBLIC_APP_URL`
 * (e.g. `https://budget.ehnand.com/`) previously corrupted the sitemap `<loc>`
 * entries, the robots `Sitemap:` directive, every sub-page `og:url`, and every
 * JSON-LD `@id`/`url` (`…com//features`). The page <link rel=canonical> tags
 * were unaffected because Next normalizes those through `metadataBase`, which
 * HID the defect — so always build absolute SEO URLs through here.
 */
export const APP_URL = (
	process.env.NEXT_PUBLIC_APP_URL ?? 'https://budget.umbra.build'
).replace(/\/+$/, '');

/** Build an absolute URL from a path — slash-safe regardless of leading/trailing slashes. */
export const absoluteUrl = (path = ''): string => {
	const normalizedPath = path.replace(/^\/+/, '');

	return normalizedPath ? `${APP_URL}/${normalizedPath}` : APP_URL;
};
