'use server';

import { auth } from '@/auth';
import { AccountService } from './account.service';
import {
	createAccountSchema,
	updateAccountSchema,
	adjustBalanceSchema,
} from './account.types';
import { revalidatePath } from 'next/cache';
import { AccountType } from '@prisma/client';
import { IncomeService } from '../income/income.service';
import { ExpenseService } from '../expense/expense.service';

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
 * Server Action: Create Account
 */
export async function createAccountAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const type = formData.get('type') as AccountType;
	const isLiabilityInput = formData.get('isLiability') === 'on';

	// Enforce Liability for Credit/Loan types
	const isLiability = ['CREDIT', 'LOAN'].includes(type)
		? true
		: isLiabilityInput;

	const rawData = {
		name: formData.get('name') as string,
		type,
		balance: Number(formData.get('balance')),
		isLiability,
		creditLimit: formData.get('creditLimit')
			? Number(formData.get('creditLimit'))
			: null,
		icon: formData.get('icon') as string | null,
		color: formData.get('color') as string | null,
	};

	const validatedFields = createAccountSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await AccountService.createAccount(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to create account:', error);
		return { error: 'Failed to create account' };
	}
}

/**
 * Server Action: Update Account
 */
export async function updateAccountAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const type = formData.get('type') as AccountType;
	const isLiabilityInput = formData.get('isLiability') === 'on';

	// Enforce Liability for Credit/Loan types
	const isLiability = ['CREDIT', 'LOAN'].includes(type)
		? true
		: isLiabilityInput;

	const rawData = {
		id: formData.get('id') as string,
		name: formData.get('name') as string,
		type,
		balance: formData.get('balance')
			? Number(formData.get('balance'))
			: undefined,
		isLiability,
		creditLimit: formData.get('creditLimit')
			? Number(formData.get('creditLimit'))
			: null,
		icon: formData.get('icon') as string | null,
		color: formData.get('color') as string | null,
	};

	const validatedFields = updateAccountSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await AccountService.updateAccount(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to update account:', error);
		return { error: 'Failed to update account' };
	}
}

/**
 * Server Action: Delete Account
 */
export async function deleteAccountAction(accountId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await AccountService.deleteAccount(userId, accountId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete account:', error);
		return {
			error: 'Failed to delete account. It may have related transactions.',
		};
	}
}

/**
 * Server Action: Adjust Account Balance
 */
export async function adjustAccountBalanceAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		accountId: formData.get('accountId') as string,
		newBalance: Number(formData.get('newBalance')),
	};

	const validatedFields = adjustBalanceSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	const { accountId, newBalance } = validatedFields.data;

	try {
		const account = await AccountService.getAccountWithTransactions(
			userId,
			accountId
		);

		if (!account) {
			return { error: 'Account not found' };
		}

		const currentBalance = account.balance.toNumber();
		const diff = newBalance - currentBalance;
		const isLiability = account.isLiability;

		if (Math.abs(diff) < 0.01) {
			return { success: true }; // No change
		}

		const needsIncome = isLiability ? diff < 0 : diff > 0;

		if (needsIncome) {
			await IncomeService.createIncome(userId, {
				amount: Math.abs(diff),
				date: new Date(),
				description: 'Manual Balance Adjustment',
				categoryName: 'Initial Balance/Adjustment',
				accountId: accountId,
				isRecurring: false,
				titheEnabled: false,
				tithePercentage: 0,
				emergencyFundEnabled: false,
				emergencyFundPercentage: 0,
			});
		} else {
			await ExpenseService.createExpense(userId, {
				amount: Math.abs(diff),
				date: new Date(),
				description: 'Manual Balance Adjustment',
				categoryName: 'Initial Balance/Adjustment',
				accountId: accountId,
				isRecurring: false,
			});
		}

		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to adjust balance:', error);
		return { error: 'Failed to adjust balance' };
	}
}
