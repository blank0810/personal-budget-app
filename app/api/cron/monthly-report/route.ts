import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addBatchReportJobs } from '@/server/modules/report/report.queue';
import { startOfMonth, subMonths } from 'date-fns';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();

	try {
		const users = await prisma.user.findMany({
			where: {
				NOT: {
					notificationPreferences: {
						some: {
							notificationType: { key: 'monthly_report' },
							enabled: false,
						},
					},
				},
			},
			select: { id: true },
		});

		if (users.length === 0) {
			await prisma.cronRunLog.create({
				data: {
					key: 'monthly-report',
					status: 'success',
					processedCount: 0,
					duration: Date.now() - startTime,
				},
			});
			return NextResponse.json({
				message: 'No opted-in users',
				count: 0,
			});
		}

		const period = startOfMonth(subMonths(new Date(), 1));
		const userIds = users.map((u) => u.id);

		await addBatchReportJobs(userIds, period);

		await prisma.cronRunLog.create({
			data: {
				key: 'monthly-report',
				status: 'success',
				processedCount: userIds.length,
				duration: Date.now() - startTime,
			},
		});

		return NextResponse.json({
			message: `Queued ${userIds.length} report jobs`,
			count: userIds.length,
			period: period.toISOString(),
		});
	} catch (error) {
		await prisma.cronRunLog.create({
			data: {
				key: 'monthly-report',
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
