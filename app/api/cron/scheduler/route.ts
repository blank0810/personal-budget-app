import { NextRequest, NextResponse } from 'next/server';
import { AutomationService } from '@/server/modules/automation/automation.service';
import { NotificationService } from '@/server/modules/notification/notification.service';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Project the code-side notification registry into the database.
	//
	// This runs here, on the scheduler tick, because it is the only code path
	// guaranteed to execute in production. The registry's other projection path is
	// `prisma/seed.ts`, and the seed is NOT part of the deploy pipeline (`build` is
	// just `next build`). Without this, a notification type added in code would
	// never get a row in production, so it would never appear in the preferences
	// UI and users could not toggle it — which is exactly what happened after the
	// six new types shipped.
	//
	// It cannot be an automation job for the same reason: a new job needs a seeded
	// AutomationSchedule row, and seeding is the thing we cannot rely on.
	//
	// Idempotent (upserts), cheap, and isolated so a sync failure never stops the
	// automations from running.
	let notificationTypes: { synced: number; preserved: number } | null = null;
	try {
		notificationTypes = await NotificationService.syncTypes();
	} catch (error) {
		console.error('Notification type sync failed:', error);
	}

	try {
		const results = await AutomationService.runDue(new Date());
		return NextResponse.json({ notificationTypes, results });
	} catch (error) {
		console.error('Automation scheduler failed:', error);
		return NextResponse.json(
			{ error: 'Scheduler failed', notificationTypes },
			{ status: 500 }
		);
	}
}
