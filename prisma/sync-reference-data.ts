/**
 * Project code-defined reference data into the database.
 *
 * Runs as part of `build:prod`, immediately after `prisma migrate deploy`.
 *
 * WHY THIS EXISTS: two registries live in code — notification types and
 * automation jobs — but both need database rows to function, because users
 * toggle preferences against a NotificationType row and the scheduler reads
 * AutomationSchedule rows. Until now the only thing that wrote those rows was
 * `prisma/seed.ts`, which is NOT part of the deploy pipeline (it only runs via
 * the destructive `deploy:fresh` reset). So a notification type added in code
 * shipped to production with no row, and never appeared in anyone's preferences
 * — which is exactly what happened: six new types deployed and users still saw
 * only the original three.
 *
 * Distinct from the seed on purpose: the seed also creates demo users and demo
 * financial data, which must never run against production. This script touches
 * reference data only and is safe to run on every deploy.
 *
 * Idempotent. Preserves admin edits (automation cadence, enabled state) and user
 * choices (notification preferences), and applies the same default-flip
 * protection as the scheduled sync.
 */
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../server/modules/notification/notification.service';
import { computeNextRunAt } from '../server/modules/automation/automation.service';
import { AUTOMATION_JOBS } from '../server/modules/automation/registry';

const prisma = new PrismaClient();

async function syncAutomationSchedules() {
	const now = new Date();
	let created = 0;

	for (const job of AUTOMATION_JOBS) {
		const existing = await prisma.automationSchedule.findFirst({
			where: { jobKey: job.jobKey, userId: null },
			select: { id: true },
		});

		if (existing) continue;

		await prisma.automationSchedule.create({
			data: {
				id: `system-${job.jobKey}`,
				jobKey: job.jobKey,
				userId: null,
				...job.defaultCadence,
				nextRunAt: computeNextRunAt(job.defaultCadence, now),
			},
		});
		created++;
	}

	return { total: AUTOMATION_JOBS.length, created };
}

async function main() {
	const types = await NotificationService.syncTypes();
	console.log(
		`[reference-data] notification types: ${types.synced} synced` +
			(types.preserved
				? `, ${types.preserved} implicit opt-ins preserved before a default changed`
				: '')
	);

	const schedules = await syncAutomationSchedules();
	console.log(
		`[reference-data] automation schedules: ${schedules.total} known, ${schedules.created} created`
	);
}

main()
	.catch((error) => {
		console.error('[reference-data] sync failed:', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
