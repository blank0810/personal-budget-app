import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { CronService } from '@/server/modules/cron/cron.service';

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

		await CronService.logSuccess('invoice-overdue', {
			processedCount: result.processed,
			duration,
		});

		return NextResponse.json({
			message: `Marked ${result.processed} invoices as overdue`,
			duration: `${duration}ms`,
		});
	} catch (error) {
		await CronService.logFailure('invoice-overdue', {
			error,
			duration: Date.now() - startTime,
		});

		return NextResponse.json(
			{ error: 'Cron job failed' },
			{ status: 500 }
		);
	}
}
