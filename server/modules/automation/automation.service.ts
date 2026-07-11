import type {
	AutomationFrequency,
	AutomationSchedule,
} from '@prisma/client';
import {
	addDays,
	addHours,
	addMonths,
	getDay,
	getDaysInMonth,
	isAfter,
	set,
	startOfMonth,
} from 'date-fns';
import prisma from '@/lib/prisma';
import { CronService } from '@/server/modules/cron/cron.service';
import {
	automationRegistry,
	isAutomationJobKey,
} from './registry';
import {
	updateAutomationScheduleSchema,
	type UpdateAutomationScheduleInput,
} from './automation.types';

const STALE_LOCK_MS = 15 * 60 * 1000;

type ScheduleCadence = Pick<
	AutomationSchedule,
	'frequency' | 'atMinute' | 'atHour' | 'dayOfWeek' | 'dayOfMonth'
>;

export type AutomationRunResult =
	| {
			jobKey: string;
			status: 'success';
			processedCount: number;
			duration: number;
	  }
	| {
			jobKey: string;
			status: 'failed';
			error: string;
			duration: number;
	  }
	| {
			jobKey: string;
			status: 'skipped';
			reason: 'already-running';
	  };

function atTime(date: Date, atHour: number, atMinute: number) {
	return set(date, {
		hours: atHour,
		minutes: atMinute,
		seconds: 0,
		milliseconds: 0,
	});
}

function monthlyOccurrence(
	month: Date,
	dayOfMonth: number,
	atHour: number,
	atMinute: number
) {
	const firstOfMonth = startOfMonth(month);
	const clampedDay = Math.min(dayOfMonth, getDaysInMonth(firstOfMonth));
	return atTime(addDays(firstOfMonth, clampedDay - 1), atHour, atMinute);
}

/**
 * Compute the first configured occurrence strictly after `from`.
 * Months shorter than dayOfMonth use their final calendar day.
 */
export function computeNextRunAt(schedule: ScheduleCadence, from: Date): Date {
	const atMinute = schedule.atMinute ?? 0;
	const atHour = schedule.atHour ?? 0;

	switch (schedule.frequency) {
		case 'HOURLY': {
			const candidate = set(from, {
				minutes: atMinute,
				seconds: 0,
				milliseconds: 0,
			});
			return isAfter(candidate, from) ? candidate : addHours(candidate, 1);
		}
		case 'DAILY': {
			const candidate = atTime(from, atHour, atMinute);
			return isAfter(candidate, from) ? candidate : addDays(candidate, 1);
		}
		case 'WEEKLY': {
			const dayOfWeek = schedule.dayOfWeek ?? 0;
			const todayAtTime = atTime(from, atHour, atMinute);
			const daysUntilTarget = (dayOfWeek - getDay(todayAtTime) + 7) % 7;
			const candidate = addDays(todayAtTime, daysUntilTarget);
			return isAfter(candidate, from) ? candidate : addDays(candidate, 7);
		}
		case 'MONTHLY': {
			const dayOfMonth = schedule.dayOfMonth ?? 1;
			const candidate = monthlyOccurrence(
				from,
				dayOfMonth,
				atHour,
				atMinute
			);
			return isAfter(candidate, from)
				? candidate
				: monthlyOccurrence(
						addMonths(startOfMonth(from), 1),
						dayOfMonth,
						atHour,
						atMinute
					);
		}
	}
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Unknown error';
}

async function logFailureSafely(
	jobKey: string,
	error: unknown,
	duration: number
) {
	try {
		await CronService.logFailure(jobKey, { error, duration });
	} catch (loggingError) {
		console.error(
			`Failed to write CronRunLog for ${jobKey}:`,
			loggingError
		);
	}
}

async function markFailedSafely(
	schedule: AutomationSchedule,
	now: Date
) {
	try {
		await prisma.automationSchedule.update({
			where: { id: schedule.id },
			data: {
				lastStatus: 'failed',
				nextRunAt: computeNextRunAt(schedule, now),
			},
		});
	} catch (updateError) {
		console.error(
			`Failed to update automation schedule ${schedule.jobKey}:`,
			updateError
		);
	}
}

export const AutomationService = {
	async getSchedules() {
		return prisma.automationSchedule.findMany({
			where: { userId: null },
			orderBy: { jobKey: 'asc' },
		});
	},

	async updateSchedule(
		id: string,
		data: UpdateAutomationScheduleInput
	) {
		const parsed = updateAutomationScheduleSchema.parse(data);
		const cadence: ScheduleCadence = {
			frequency: parsed.frequency as AutomationFrequency,
			atMinute: parsed.atMinute ?? null,
			atHour: parsed.atHour ?? null,
			dayOfWeek: parsed.dayOfWeek ?? null,
			dayOfMonth: parsed.dayOfMonth ?? null,
		};
		const nextRunAt = computeNextRunAt(cadence, new Date());

		return prisma.automationSchedule.update({
			where: { id, userId: null },
			data: {
				...cadence,
				enabled: parsed.enabled,
				nextRunAt,
			},
		});
	},

	async runDue(now: Date): Promise<AutomationRunResult[]> {
		const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
		const schedules = await prisma.automationSchedule.findMany({
			where: {
				userId: null,
				enabled: true,
				OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
			},
			orderBy: { jobKey: 'asc' },
		});

		const results: AutomationRunResult[] = [];

		for (const schedule of schedules) {
			if (
				schedule.lastStatus === 'running' &&
				schedule.updatedAt > staleBefore
			) {
				results.push({
					jobKey: schedule.jobKey,
					status: 'skipped',
					reason: 'already-running',
				});
				continue;
			}

			const startedAt = Date.now();

			try {
				const claimed = await prisma.automationSchedule.updateMany({
					where: {
						id: schedule.id,
						OR: [
							{ lastStatus: null },
							{ lastStatus: { not: 'running' } },
							{ updatedAt: { lte: staleBefore } },
						],
					},
					data: { lastStatus: 'running' },
				});

				if (claimed.count === 0) {
					results.push({
						jobKey: schedule.jobKey,
						status: 'skipped',
						reason: 'already-running',
					});
					continue;
				}

				if (!isAutomationJobKey(schedule.jobKey)) {
					throw new Error(`Unknown automation job: ${schedule.jobKey}`);
				}

				const { processedCount } =
					await automationRegistry[schedule.jobKey]();
				const duration = Date.now() - startedAt;

				await CronService.logSuccess(schedule.jobKey, {
					processedCount,
					duration,
				});

				await prisma.automationSchedule.update({
					where: { id: schedule.id },
					data: {
						lastRunAt: now,
						lastStatus: 'success',
						nextRunAt: computeNextRunAt(schedule, now),
					},
				});

				results.push({
					jobKey: schedule.jobKey,
					status: 'success',
					processedCount,
					duration,
				});
			} catch (error) {
				const duration = Date.now() - startedAt;
				await logFailureSafely(schedule.jobKey, error, duration);
				await markFailedSafely(schedule, now);
				results.push({
					jobKey: schedule.jobKey,
					status: 'failed',
					error: errorMessage(error),
					duration,
				});
			}
		}

		return results;
	},
};
