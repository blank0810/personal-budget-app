'use server';

import { auth } from '@/auth';
import { RecurringService } from './recurring.service';
import { createRecurringSchema, updateRecurringSchema } from './recurring.types';
import { clearCache } from '@/server/actions/cache';

async function getAuthenticatedUser() {
	const session = await auth();
	if (!session?.user?.id) throw new Error('Not authenticated');
	return session.user.id;
}

export async function createRecurringAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const parsed = createRecurringSchema.safeParse({
		name: formData.get('name'),
		type: formData.get('type'),
		amount: Number(formData.get('amount')),
		description: formData.get('description') || undefined,
		frequency: formData.get('frequency'),
		startDate: formData.get('startDate'),
		endDate: formData.get('endDate') || undefined,
		categoryId: formData.get('categoryId'),
		accountId: formData.get('accountId') || undefined,
		budgetId: formData.get('budgetId') || undefined,
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await RecurringService.create(userId, parsed.data);
		await clearCache('/recurring');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to create recurring transaction',
		};
	}
}

export async function updateRecurringAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const parsed = updateRecurringSchema.safeParse({
		id: formData.get('id'),
		name: formData.get('name') || undefined,
		type: formData.get('type') || undefined,
		amount: formData.get('amount')
			? Number(formData.get('amount'))
			: undefined,
		description: formData.get('description') || undefined,
		frequency: formData.get('frequency') || undefined,
		startDate: formData.get('startDate') || undefined,
		endDate: formData.get('endDate') || undefined,
		categoryId: formData.get('categoryId') || undefined,
		accountId: formData.get('accountId') || undefined,
		isActive:
			formData.get('isActive') != null
				? formData.get('isActive') === 'true'
				: undefined,
	});

	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await RecurringService.update(userId, parsed.data);
		await clearCache('/recurring');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to update recurring transaction',
		};
	}
}

export async function deleteRecurringAction(id: string) {
	const userId = await getAuthenticatedUser();

	try {
		await RecurringService.delete(userId, id);
		await clearCache('/recurring');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to delete recurring transaction',
		};
	}
}

export async function toggleRecurringAction(id: string) {
	const userId = await getAuthenticatedUser();

	try {
		await RecurringService.toggleActive(userId, id);
		await clearCache('/recurring');
		return { success: true };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to toggle recurring transaction',
		};
	}
}
