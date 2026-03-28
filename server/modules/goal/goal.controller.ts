'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { GoalService } from './goal.service';
import {
	createGoalSchema,
	updateGoalSchema,
	addContributionSchema,
} from './goal.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';

export async function createGoalAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const goalType = (formData.get('goalType') as string) || 'FIXED_AMOUNT';
	const isEmergencyFund = formData.get('isEmergencyFund') === 'true';

	const parsed = createGoalSchema.safeParse({
		name: formData.get('name'),
		targetAmount: Number(formData.get('targetAmount') || 0),
		deadline: formData.get('deadline') || undefined,
		icon: formData.get('icon') || undefined,
		color: formData.get('color') || undefined,
		linkedAccountId: formData.get('linkedAccountId') || undefined,
		goalType,
		isEmergencyFund,
		thresholdLow: formData.get('thresholdLow')
			? Number(formData.get('thresholdLow'))
			: undefined,
		thresholdMid: formData.get('thresholdMid')
			? Number(formData.get('thresholdMid'))
			: undefined,
		thresholdHigh: formData.get('thresholdHigh')
			? Number(formData.get('thresholdHigh'))
			: undefined,
	});

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	// Enforce single emergency fund per user
	if (parsed.data.isEmergencyFund) {
		const existing = await GoalService.getEmergencyFundGoal(userId);
		if (existing) {
			return {
				error: 'You already have an Emergency Fund goal. Only one is allowed.',
			};
		}
	}

	try {
		await GoalService.create(userId, parsed.data);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to create goal',
		};
	}
}

export async function updateGoalAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const parsed = updateGoalSchema.safeParse({
		id: formData.get('id'),
		name: formData.get('name') || undefined,
		targetAmount: formData.get('targetAmount')
			? Number(formData.get('targetAmount'))
			: undefined,
		deadline: formData.get('deadline') || undefined,
		icon: formData.get('icon') || undefined,
		color: formData.get('color') || undefined,
		goalType: formData.get('goalType') || undefined,
		isEmergencyFund: formData.has('isEmergencyFund')
			? formData.get('isEmergencyFund') === 'true'
			: undefined,
		thresholdLow: formData.get('thresholdLow')
			? Number(formData.get('thresholdLow'))
			: undefined,
		thresholdMid: formData.get('thresholdMid')
			? Number(formData.get('thresholdMid'))
			: undefined,
		thresholdHigh: formData.get('thresholdHigh')
			? Number(formData.get('thresholdHigh'))
			: undefined,
	});

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	// Enforce single emergency fund per user when toggling on
	if (parsed.data.isEmergencyFund) {
		const existing = await GoalService.getEmergencyFundGoal(userId);
		if (existing && existing.id !== parsed.data.id) {
			return {
				error: 'You already have an Emergency Fund goal. Only one is allowed.',
			};
		}
	}

	try {
		await GoalService.update(userId, parsed.data);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to update goal',
		};
	}
}

export async function deleteGoalAction(id: string) {
	const userId = await getAuthenticatedUser();

	try {
		await GoalService.delete(userId, id);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete goal',
		};
	}
}

export async function archiveGoalAction(id: string) {
	const userId = await getAuthenticatedUser();

	try {
		await GoalService.archive(userId, id);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to archive goal',
		};
	}
}

export async function completeGoalAction(id: string) {
	const userId = await getAuthenticatedUser();

	try {
		await GoalService.complete(userId, id);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to complete goal',
		};
	}
}

export async function addContributionAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const parsed = addContributionSchema.safeParse({
		goalId: formData.get('goalId'),
		amount: Number(formData.get('amount')),
		note: formData.get('note') || undefined,
		date: formData.get('date') || undefined,
	});

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		await GoalService.addContribution(userId, parsed.data);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to add contribution',
		};
	}
}

export async function syncLinkedGoalsAction() {
	const userId = await getAuthenticatedUser();

	try {
		await GoalService.syncLinkedAccounts(userId);
		invalidateTags(CACHE_TAGS.GOALS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to sync goals',
		};
	}
}
