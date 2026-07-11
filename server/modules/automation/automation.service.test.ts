import type { AutomationSchedule } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	findMany: vi.fn(),
	update: vi.fn(),
	updateMany: vi.fn(),
	monthlyReport: vi.fn(),
	processReports: vi.fn(),
	invoiceOverdue: vi.fn(),
	logSuccess: vi.fn(),
	logFailure: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		automationSchedule: {
			findMany: mocks.findMany,
			update: mocks.update,
			updateMany: mocks.updateMany,
		},
	},
}));

vi.mock('@/server/modules/cron/cron.service', () => ({
	CronService: {
		logSuccess: mocks.logSuccess,
		logFailure: mocks.logFailure,
	},
}));

vi.mock('./registry', () => ({
	automationRegistry: {
		'monthly-report': mocks.monthlyReport,
		'process-reports': mocks.processReports,
		'invoice-overdue': mocks.invoiceOverdue,
	},
	isAutomationJobKey: (jobKey: string) =>
		['monthly-report', 'process-reports', 'invoice-overdue'].includes(jobKey),
}));

import {
	AutomationService,
	computeNextRunAt,
} from './automation.service';

function makeSchedule(
	overrides: Partial<AutomationSchedule> = {}
): AutomationSchedule {
	return {
		id: 'schedule-1',
		jobKey: 'monthly-report',
		userId: null,
		frequency: 'DAILY',
		atMinute: 0,
		atHour: 0,
		dayOfWeek: null,
		dayOfMonth: null,
		enabled: true,
		lastRunAt: null,
		nextRunAt: null,
		lastStatus: null,
		createdAt: new Date(2026, 0, 1),
		updatedAt: new Date(2026, 0, 1),
		...overrides,
	};
}

describe('computeNextRunAt', () => {
	it('schedules an hourly job at the configured minute', () => {
		const result = computeNextRunAt(
			makeSchedule({ frequency: 'HOURLY', atMinute: 15 }),
			new Date(2026, 6, 11, 10, 20, 0)
		);

		expect(result).toEqual(new Date(2026, 6, 11, 11, 15, 0));
	});

	it('is strictly after from when an hourly occurrence is exact', () => {
		const result = computeNextRunAt(
			makeSchedule({ frequency: 'HOURLY', atMinute: 15 }),
			new Date(2026, 6, 11, 10, 15, 0)
		);

		expect(result).toEqual(new Date(2026, 6, 11, 11, 15, 0));
	});

	it('rolls a daily occurrence to the next day', () => {
		const result = computeNextRunAt(
			makeSchedule({ frequency: 'DAILY', atHour: 6, atMinute: 30 }),
			new Date(2026, 6, 11, 7, 0, 0)
		);

		expect(result).toEqual(new Date(2026, 6, 12, 6, 30, 0));
	});

	it('rolls an exact weekly occurrence forward seven days', () => {
		const from = new Date(2026, 6, 12, 8, 0, 0); // Sunday
		const result = computeNextRunAt(
			makeSchedule({
				frequency: 'WEEKLY',
				dayOfWeek: 0,
				atHour: 8,
				atMinute: 0,
			}),
			from
		);

		expect(result).toEqual(new Date(2026, 6, 19, 8, 0, 0));
	});

	it('clamps a monthly day to the final day of a shorter month', () => {
		const result = computeNextRunAt(
			makeSchedule({
				frequency: 'MONTHLY',
				dayOfMonth: 31,
				atHour: 9,
				atMinute: 0,
			}),
			new Date(2026, 0, 31, 9, 0, 0)
		);

		expect(result).toEqual(new Date(2026, 1, 28, 9, 0, 0));
	});
});

describe('AutomationService.runDue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.findMany.mockResolvedValue([]);
		mocks.update.mockImplementation(async ({ data }) => data);
		mocks.updateMany.mockResolvedValue({ count: 1 });
		mocks.monthlyReport.mockResolvedValue({ processedCount: 3 });
		mocks.processReports.mockResolvedValue({ processedCount: 2 });
		mocks.invoiceOverdue.mockResolvedValue({ processedCount: 1 });
		mocks.logSuccess.mockResolvedValue(undefined);
		mocks.logFailure.mockResolvedValue(undefined);
	});

	it('selects only enabled, due system schedules', async () => {
		const now = new Date(2026, 6, 11, 10, 0, 0);

		await AutomationService.runDue(now);

		expect(mocks.findMany).toHaveBeenCalledWith({
			where: {
				userId: null,
				enabled: true,
				OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
			},
			orderBy: { jobKey: 'asc' },
		});
	});

	it('reclaims and runs a stale schedule marked running', async () => {
		const now = new Date(2026, 6, 11, 10, 0, 0);
		mocks.findMany.mockResolvedValue([
			makeSchedule({
				lastStatus: 'running',
				updatedAt: new Date(2026, 6, 11, 9, 44, 59),
			}),
		]);

		const results = await AutomationService.runDue(now);

		expect(results).toEqual([
			{
				jobKey: 'monthly-report',
				status: 'success',
				processedCount: 3,
				duration: expect.any(Number),
			},
		]);
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: {
				id: 'schedule-1',
				OR: [
					{ lastStatus: null },
					{ lastStatus: { not: 'running' } },
					{
						updatedAt: {
							lte: new Date(2026, 6, 11, 9, 45, 0),
						},
					},
				],
			},
			data: { lastStatus: 'running' },
		});
		expect(mocks.monthlyReport).toHaveBeenCalledOnce();
	});

	it('skips a fresh schedule marked running', async () => {
		const now = new Date(2026, 6, 11, 10, 0, 0);
		mocks.findMany.mockResolvedValue([
			makeSchedule({
				lastStatus: 'running',
				updatedAt: new Date(2026, 6, 11, 9, 55, 0),
			}),
		]);

		const results = await AutomationService.runDue(now);

		expect(results).toEqual([
			{
				jobKey: 'monthly-report',
				status: 'skipped',
				reason: 'already-running',
			},
		]);
		expect(mocks.monthlyReport).not.toHaveBeenCalled();
		expect(mocks.update).not.toHaveBeenCalled();
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it('skips execution when another tick claims the schedule first', async () => {
		mocks.findMany.mockResolvedValue([makeSchedule()]);
		mocks.updateMany.mockResolvedValueOnce({ count: 0 });

		const results = await AutomationService.runDue(new Date());

		expect(results[0]).toMatchObject({
			jobKey: 'monthly-report',
			status: 'skipped',
			reason: 'already-running',
		});
		expect(mocks.monthlyReport).not.toHaveBeenCalled();
	});

	it('continues to later jobs after one handler fails', async () => {
		mocks.findMany.mockResolvedValue([
			makeSchedule({ id: 'monthly', jobKey: 'monthly-report' }),
			makeSchedule({ id: 'reports', jobKey: 'process-reports' }),
		]);
		mocks.monthlyReport.mockRejectedValueOnce(new Error('queue unavailable'));

		const results = await AutomationService.runDue(
			new Date(2026, 6, 11, 10, 0, 0)
		);

		expect(results.map((result) => result.status)).toEqual([
			'failed',
			'success',
		]);
		expect(mocks.logFailure).toHaveBeenCalledWith(
			'monthly-report',
			expect.objectContaining({ error: expect.any(Error) })
		);
		expect(mocks.processReports).toHaveBeenCalledOnce();
		expect(mocks.logSuccess).toHaveBeenCalledWith(
			'process-reports',
			expect.objectContaining({ processedCount: 2 })
		);
	});
});
