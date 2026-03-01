'use server';

import { auth } from '@/auth';
import { GoalService } from './goal.service';
import {
	createGoalSchema,
	updateGoalSchema,
	addContributionSchema,
} from './goal.types';
import { clearCache } from '@/server/actions/cache';

async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Not authenticated');
	return session.user.id;
}

export async function createGoalAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const parsed = createGoalSchema.safeParse({
		name: formData.get('name'),
		targetAmount: Number(formData.get('targetAmount')),
		deadline: formData.get('deadline') || undefined,
		icon: formData.get('icon') || undefined,
		color: formData.get('color') || undefined,
		linkedAccountId: formData.get('linkedAccountId') || undefined,
	});

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		await GoalService.create(userId, parsed.data);
		await clearCache('/goals');
		return { success: true };
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
	});

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		await GoalService.update(userId, parsed.data);
		await clearCache('/goals');
		return { success: true };
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
		await clearCache('/goals');
		return { success: true };
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
		await clearCache('/goals');
		return { success: true };
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
		await clearCache('/goals');
		return { success: true };
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
		await clearCache('/goals');
		return { success: true };
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
		await clearCache('/goals');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to sync goals',
		};
	}
}
