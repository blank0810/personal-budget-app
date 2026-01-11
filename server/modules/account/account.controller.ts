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

	// Check if this is a fund type
	const isFundType = ['EMERGENCY_FUND', 'FUND'].includes(type);

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
		// Fund-specific fields
		targetAmount:
			isFundType && formData.get('targetAmount')
				? Number(formData.get('targetAmount'))
				: null,
		fundCalculationMode: isFundType
			? (formData.get('fundCalculationMode') as string | null)
			: null,
		fundThresholdLow:
			isFundType && formData.get('fundThresholdLow')
				? Number(formData.get('fundThresholdLow'))
				: null,
		fundThresholdMid:
			isFundType && formData.get('fundThresholdMid')
				? Number(formData.get('fundThresholdMid'))
				: null,
		fundThresholdHigh:
			isFundType && formData.get('fundThresholdHigh')
				? Number(formData.get('fundThresholdHigh'))
				: null,
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

	// Check if this is a fund type
	const isFundType = ['EMERGENCY_FUND', 'FUND'].includes(type);

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
		// Fund-specific fields
		targetAmount:
			isFundType && formData.get('targetAmount')
				? Number(formData.get('targetAmount'))
				: null,
		fundCalculationMode: isFundType
			? (formData.get('fundCalculationMode') as string | null)
			: null,
		fundThresholdLow:
			isFundType && formData.get('fundThresholdLow')
				? Number(formData.get('fundThresholdLow'))
				: null,
		fundThresholdMid:
			isFundType && formData.get('fundThresholdMid')
				? Number(formData.get('fundThresholdMid'))
				: null,
		fundThresholdHigh:
			isFundType && formData.get('fundThresholdHigh')
				? Number(formData.get('fundThresholdHigh'))
				: null,
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
		// 1. Fetch current account to compare balance
		// We use a direct service call logic here or import prisma if need strict checking,
		// but relying on Service is cleaner. Assuming Service has getAccount.
		// Since AccountService.getAccount is not exported or we are in controller, let's use direct Access or add getAccount to Service.
		// Actually AccountService.getAccountWithTransactions exists but is heavy.
		// Let's assume we can trust the AccountService to help us or we use the one-off approach.
		// Wait, I can't import prisma here directly if I want to stick to patterns, but the Service is right there.
		// Let's use AccountService.getAccountById if it exists.
		// Checking AccountService... it has getAccountWithTransactions. I'll use that.

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

		// For assets: diff > 0 means money came in (Income), diff < 0 means money went out (Expense)
		// For liabilities: diff > 0 means debt increased (Expense), diff < 0 means debt decreased (Income/Payment)
		const needsIncome = isLiability ? diff < 0 : diff > 0;

		if (needsIncome) {
			// Income: For assets, increases balance. For liabilities, decreases balance (payment).
			await IncomeService.createIncome(userId, {
				amount: Math.abs(diff),
				date: new Date(),
				description: 'Manual Balance Adjustment',
				categoryName: 'Initial Balance/Adjustment', // Will be created if missing
				accountId: accountId,
				isRecurring: false,
				titheEnabled: false,
				tithePercentage: 0,
			});
		} else {
			// Expense: For assets, decreases balance. For liabilities, increases balance (more debt).
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
