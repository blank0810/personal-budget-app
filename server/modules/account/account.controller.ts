'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { AccountService } from './account.service';
import {
	createAccountSchema,
	updateAccountSchema,
	adjustBalanceSchema,
} from './account.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { IncomeService } from '../income/income.service';
import { ExpenseService } from '../expense/expense.service';

/**
 * Server Action: Create Account
 */
export async function createAccountAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createAccountSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	// Enforce Liability for Credit/Loan types (server-side guard)
	if (['CREDIT', 'LOAN'].includes(parsed.data.type)) {
		parsed.data.isLiability = true;
	}

	try {
		await AccountService.createAccount(userId, parsed.data);
		invalidateTags(CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to create account:', error);
		return { error: 'Failed to create account' };
	}
}

/**
 * Server Action: Update Account
 */
export async function updateAccountAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = updateAccountSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	// Enforce Liability for Credit/Loan types (server-side guard)
	if (parsed.data.type && ['CREDIT', 'LOAN'].includes(parsed.data.type)) {
		parsed.data.isLiability = true;
	}

	try {
		await AccountService.updateAccount(userId, parsed.data);
		invalidateTags(CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
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
		invalidateTags(CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
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
export async function adjustAccountBalanceAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = adjustBalanceSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	const { accountId, newBalance } = parsed.data;

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
			return { success: true as const }; // No change
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

		invalidateTags(
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.DASHBOARD
		);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to adjust balance:', error);
		return { error: 'Failed to adjust balance' };
	}
}
