import { NextRequest, NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/indexnow';
import { getSeoUrls } from '@/lib/seo-urls';
import { absoluteUrl } from '@/lib/url';

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const querySecret = req.nextUrl.searchParams.get('secret');
	const cronSecret = process.env.CRON_SECRET;

	if (
		!cronSecret ||
		(authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret)
	) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const urls = getSeoUrls().map(({ path }) => absoluteUrl(path));
		const indexnow = await submitToIndexNow(urls);

		return NextResponse.json({ submitted: urls.length, indexnow });
	} catch {
		return NextResponse.json(
			{ error: 'IndexNow submission failed' },
			{ status: 500 }
		);
	}
}
