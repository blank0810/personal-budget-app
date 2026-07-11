import { APP_URL, absoluteUrl } from '@/lib/url';

export const INDEXNOW_KEY = '67cb763152894d8e93074285c12e6099';

export async function submitToIndexNow(
	urls: string[]
): Promise<{ ok: boolean; status: number }> {
	const response = await fetch('https://api.indexnow.org/indexnow', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
		},
		body: JSON.stringify({
			host: new URL(APP_URL).host,
			key: INDEXNOW_KEY,
			keyLocation: absoluteUrl(`/${INDEXNOW_KEY}.txt`),
			urlList: urls,
		}),
	});

	return { ok: response.ok, status: response.status };
}
