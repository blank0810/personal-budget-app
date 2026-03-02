import { NextRequest, NextResponse } from 'next/server';
import { RecurringService } from '@/server/modules/recurring/recurring.service';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();

	try {
		const result = await RecurringService.processDue();
		const duration = Date.now() - startTime;

		await prisma.cronRunLog.create({
			data: {
				key: 'process-recurring',
				status: 'success',
				processedCount: result.processed,
				duration,
			},
		});

		return NextResponse.json({
			message: `Processed ${result.processed} recurring transactions`,
			duration: `${duration}ms`,
			...result,
		});
	} catch (error) {
		await prisma.cronRunLog.create({
			data: {
				key: 'process-recurring',
				status: 'failed',
				errorMessage:
					error instanceof Error ? error.message : 'Unknown error',
				duration: Date.now() - startTime,
			},
		});

		return NextResponse.json(
			{ error: 'Cron job failed' },
			{ status: 500 }
		);
	}
}
