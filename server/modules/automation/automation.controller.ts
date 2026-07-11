'use server';

import type { AutomationSchedule } from '@prisma/client';
import { invalidateTags } from '@/server/actions/cache';
import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { AdminService } from '@/server/modules/admin/admin.service';
import { AutomationService } from './automation.service';
import { getAutomationJobLabel } from './registry';
import {
	automationScheduleIdSchema,
	type AutomationScheduleDto,
	updateAutomationScheduleSchema,
} from './automation.types';

async function assertAdminSession() {
	const userId = await getAuthenticatedUser();
	const isAdmin = await AdminService.isAdminSessionActive(userId);

	if (!isAdmin) {
		throw new Error('Unauthorized');
	}
}

function actionError(error: unknown, fallback: string) {
	return { error: error instanceof Error ? error.message : fallback };
}

function toScheduleDto(schedule: AutomationSchedule): AutomationScheduleDto {
	return {
		...schedule,
		label: getAutomationJobLabel(schedule.jobKey),
		lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
		nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
		createdAt: schedule.createdAt.toISOString(),
		updatedAt: schedule.updatedAt.toISOString(),
	};
}

export async function getSchedulesAction() {
	try {
		await assertAdminSession();
		const schedules = await AutomationService.getSchedules();
		return {
			success: true as const,
			data: {
				schedules: schedules.map(toScheduleDto),
			},
		};
	} catch (error) {
		return actionError(error, 'Failed to fetch automation schedules');
	}
}

export async function updateScheduleAction(id: unknown, input: unknown) {
	try {
		await assertAdminSession();

		const parsedId = automationScheduleIdSchema.safeParse(id);
		if (!parsedId.success) {
			return {
				error:
					parsedId.error.issues[0]?.message ?? 'Invalid schedule id',
			};
		}

		const parsedInput = updateAutomationScheduleSchema.safeParse(input);
		if (!parsedInput.success) {
			return {
				error:
					parsedInput.error.issues[0]?.message ?? 'Validation failed',
			};
		}

		const schedule = await AutomationService.updateSchedule(
			parsedId.data,
			parsedInput.data
		);
		await invalidateTags(CACHE_TAGS.AUTOMATION_SCHEDULES);

		return {
			success: true as const,
			data: { schedule: toScheduleDto(schedule) },
		};
	} catch (error) {
		return actionError(error, 'Failed to update automation schedule');
	}
}
