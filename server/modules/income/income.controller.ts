'use server';

import { auth } from '@/auth';
import { IncomeService } from './income.service';
import { createIncomeSchema, updateIncomeSchema } from './income.types';
import { revalidatePath } from 'next/cache';

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
 * Server Action: Create Income
 */
export async function createIncomeAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	// Parse FormData
	const rawData = {
		amount: Number(formData.get('amount')),
		description: formData.get('description') as string,
		date: new Date(formData.get('date') as string),
		categoryId: (formData.get('categoryId') as string) || undefined,
		categoryName: (formData.get('categoryName') as string) || undefined, // NEW: for custom category
		accountId: (formData.get('accountId') as string) || undefined,
		isRecurring: formData.get('isRecurring') === 'on',
		recurringPeriod:
			(formData.get('recurringPeriod') as
				| 'MONTHLY'
				| 'WEEKLY'
				| 'YEARLY') || undefined,
		titheEnabled: formData.get('titheEnabled') === 'on',
		tithePercentage: Number(formData.get('tithePercentage')) || undefined,
		emergencyFundEnabled: formData.get('emergencyFundEnabled') === 'on',
		emergencyFundPercentage:
			Number(formData.get('emergencyFundPercentage')) || undefined,
	};

	// Validate
	const validatedFields = createIncomeSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await IncomeService.createIncome(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to create income:', error);
		return { error: 'Failed to create income' };
	}
}

/**
 * Server Action: Update Income
 */
export async function updateIncomeAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		id: formData.get('id') as string,
		amount: Number(formData.get('amount')),
		description: formData.get('description') as string,
		date: new Date(formData.get('date') as string),
		categoryId: (formData.get('categoryId') as string) || undefined,
		accountId: (formData.get('accountId') as string) || undefined,
		isRecurring: formData.get('isRecurring') === 'on',
		recurringPeriod:
			(formData.get('recurringPeriod') as
				| 'MONTHLY'
				| 'WEEKLY'
				| 'YEARLY') || undefined,
	};

	const validatedFields = updateIncomeSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await IncomeService.updateIncome(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to update income:', error);
		return { error: 'Failed to update income' };
	}
}

/**
 * Server Action: Delete Income
 */
export async function deleteIncomeAction(incomeId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await IncomeService.deleteIncome(userId, incomeId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete income:', error);
		return { error: 'Failed to delete income' };
	}
}

/**
 * Get income stability analysis for EF suggestion
 */
export async function getIncomeStabilityAction() {
	const userId = await getAuthenticatedUser();

	try {
		const analysis = await IncomeService.analyzeIncomeStability(userId, 6);
		return { success: true, data: analysis };
	} catch (error) {
		console.error('Failed to analyze income stability:', error);
		return { error: 'Failed to analyze income stability' };
	}
}
