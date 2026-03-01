import { NextRequest, NextResponse } from 'next/server';
import { processBatch } from '@/server/modules/notification/sms.queue';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();

	try {
		const processed = await processBatch(50);

		await prisma.cronRunLog.create({
			data: {
				key: 'process-sms',
				status: 'success',
				processedCount: processed,
				duration: Date.now() - startTime,
			},
		});

		return NextResponse.json({
			message: `Processed ${processed} SMS jobs`,
			processed,
		});
	} catch (error) {
		await prisma.cronRunLog.create({
			data: {
				key: 'process-sms',
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
