import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addBatchReportJobs } from '@/server/modules/report/report.queue';
import { startOfMonth, subMonths } from 'date-fns';

export async function GET(req: NextRequest) {
	// Verify cron secret
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get all users who have NOT explicitly disabled monthly_report
	// Default is enabled, so we exclude users with an explicit enabled=false override
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
		return NextResponse.json({ message: 'No opted-in users', count: 0 });
	}

	// Previous month (e.g., if today is Feb 1, generate for January)
	const period = startOfMonth(subMonths(new Date(), 1));
	const userIds = users.map((u) => u.id);

	await addBatchReportJobs(userIds, period);

	return NextResponse.json({
		message: `Queued ${userIds.length} report jobs`,
		count: userIds.length,
		period: period.toISOString(),
	});
}
