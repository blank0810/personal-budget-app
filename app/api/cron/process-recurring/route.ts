import { NextRequest, NextResponse } from 'next/server';
import { RecurringService } from '@/server/modules/recurring/recurring.service';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();
	const result = await RecurringService.processDue();
	const duration = Date.now() - startTime;

	return NextResponse.json({
		message: `Processed ${result.processed} recurring transactions`,
		duration: `${duration}ms`,
		...result,
	});
}
