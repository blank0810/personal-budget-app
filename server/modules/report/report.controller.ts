'use server';

import { auth } from '@/auth';
import { ReportService } from './report.service';
import { NotificationService } from '@/server/modules/notification/notification.service';

/**
 * Helper to authenticate user
 */
async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error('Unauthorized');
	}
	return session.user.id;
}

/**
 * Server Action: Generate and send a report for a specific month/year.
 * Calls ReportService directly — no queue needed for single-user manual triggers.
 * The queue (BullMQ) is reserved for batch cron jobs processing all users.
 */
export async function sendManualReportAction(month: number, year: number) {
	const userId = await getAuthenticatedUser();

	// Construct period as first day of the requested month (UTC)
	const period = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

	try {
		await ReportService.generateAndSend(userId, period);
		return { success: true, message: 'Report sent — check your email!' };
	} catch (error) {
		console.error('Failed to generate manual report:', error);
		return { error: 'Failed to generate report. Please try again.' };
	}
}

/**
 * Server Action: Toggle monthly report subscription
 * Now delegates to NotificationService
 */
export async function toggleMonthlyReportAction(enabled: boolean) {
	const userId = await getAuthenticatedUser();

	await NotificationService.updatePreference(userId, 'monthly_report', enabled);

	return { success: true, enabled };
}

/**
 * Server Action: Get current monthly report preference
 * Now delegates to NotificationService
 */
export async function getMonthlyReportPreference() {
	const userId = await getAuthenticatedUser();

	const enabled = await NotificationService.isEnabled(userId, 'monthly_report');

	return { enabled };
}
