import { AutomationFrequency } from '@prisma/client';
import { startOfMonth, subMonths } from 'date-fns';
import prisma from '@/lib/prisma';
import {
	addBatchReportJobs,
	processBatch,
} from '@/server/modules/report/report.queue';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';

export type AutomationJobHandler = () => Promise<{
	processedCount: number;
}>;

async function queueMonthlyReports() {
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

	const userIds = users.map((user) => user.id);
	if (userIds.length > 0) {
		const period = startOfMonth(subMonths(new Date(), 1));
		await addBatchReportJobs(userIds, period);
	}

	return { processedCount: userIds.length };
}

async function processReports() {
	const processedCount = await processBatch(50);
	return { processedCount };
}

async function processOverdueInvoices() {
	const result = await InvoiceService.processOverdue();
	return { processedCount: result.processed };
}

export const automationRegistry = {
	'monthly-report': queueMonthlyReports,
	'process-reports': processReports,
	'invoice-overdue': processOverdueInvoices,
} satisfies Record<string, AutomationJobHandler>;

export type AutomationJobKey = keyof typeof automationRegistry;

export const AUTOMATION_JOBS: ReadonlyArray<{
	jobKey: AutomationJobKey;
	label: string;
	defaultCadence: {
		frequency: AutomationFrequency;
		atMinute: number | null;
		atHour: number | null;
		dayOfWeek: number | null;
		dayOfMonth: number | null;
	};
}> = [
	{
		jobKey: 'monthly-report',
		label: 'Monthly reports',
		defaultCadence: {
			frequency: AutomationFrequency.MONTHLY,
			atMinute: 0,
			atHour: 0,
			dayOfWeek: null,
			dayOfMonth: 1,
		},
	},
	{
		jobKey: 'process-reports',
		label: 'Process report queue',
		defaultCadence: {
			frequency: AutomationFrequency.DAILY,
			atMinute: 0,
			atHour: 0,
			dayOfWeek: null,
			dayOfMonth: null,
		},
	},
	{
		jobKey: 'invoice-overdue',
		label: 'Mark overdue invoices',
		defaultCadence: {
			frequency: AutomationFrequency.DAILY,
			atMinute: 0,
			atHour: 6,
			dayOfWeek: null,
			dayOfMonth: null,
		},
	},
];

export const KNOWN_AUTOMATION_JOB_KEYS = AUTOMATION_JOBS.map(
	(job) => job.jobKey
);

export function isAutomationJobKey(jobKey: string): jobKey is AutomationJobKey {
	return Object.hasOwn(automationRegistry, jobKey);
}

export function getAutomationJobLabel(jobKey: string) {
	return (
		AUTOMATION_JOBS.find((job) => job.jobKey === jobKey)?.label ?? jobKey
	);
}
