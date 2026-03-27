import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();

	try {
		const result = await InvoiceService.processOverdue();
		const duration = Date.now() - startTime;

		await prisma.cronRunLog.create({
			data: {
				key: 'invoice-overdue',
				status: 'success',
				processedCount: result.processed,
				duration,
			},
		});

		return NextResponse.json({
			message: `Marked ${result.processed} invoices as overdue`,
			duration: `${duration}ms`,
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		await prisma.cronRunLog.create({
			data: {
				key: 'invoice-overdue',
				status: 'failed',
				errorMessage:
					error instanceof Error ? error.message : 'Unknown error',
				duration,
			},
		});

		return NextResponse.json(
			{ error: 'Cron job failed' },
			{ status: 500 }
		);
	}
}
