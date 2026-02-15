import { NextRequest, NextResponse } from 'next/server';
import { processBatch } from '@/server/modules/report/report.queue';

export async function GET(req: NextRequest) {
	// Verify cron secret
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const processed = await processBatch(50);

	return NextResponse.json({
		message: `Processed ${processed} report jobs`,
		processed,
	});
}
