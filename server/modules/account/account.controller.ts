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

/**
 * Server Action: Get Accounts
 */
export async function getAccountsAction() {
	const userId = await getAuthenticatedUser();

	try {
		const accounts = await AccountService.getAccounts(userId);
		return { success: true as const, data: accounts };
	} catch (error) {
		console.error('Failed to fetch accounts:', error);
		return { error: 'Failed to fetch accounts' };
	}
}

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
 * Server Action: Get Account KPI Summary
 */
export async function getAccountSummaryAction() {
	const userId = await getAuthenticatedUser();

	try {
		const summary = await AccountService.getAccountSummary(userId);
		return { success: true as const, data: summary };
	} catch (error) {
		console.error('Failed to fetch account summary:', error);
		return { error: 'Failed to fetch account summary' };
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

	try {
		await AccountService.adjustBalance(userId, parsed.data);
		invalidateTags(
			CACHE_TAGS.ACCOUNTS,
			CACHE_TAGS.INCOMES,
			CACHE_TAGS.EXPENSES,
			CACHE_TAGS.DASHBOARD
		);
		return { success: true as const };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to adjust balance',
		};
	}
}
