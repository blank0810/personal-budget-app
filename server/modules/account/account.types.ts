import { z } from 'zod';
import { AccountType } from '@prisma/client';

// Account Schema
export const createAccountSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	type: z.nativeEnum(AccountType),
	balance: z.number(),
	isLiability: z.boolean(),
	creditLimit: z.number().optional().nullable(),
	icon: z.string().optional().nullable(),
	color: z.string().optional().nullable(),
});

// Update payload deliberately omits `balance` and `openingBalance` — those
// are derived from the Income/Expense/Transfer trail and must only mutate
// through their respective services. A direct write here would desync the
// global ledger tripwire (Σ running totals != Σ Account.balance).
export const updateAccountSchema = createAccountSchema
	.omit({ balance: true })
	.partial()
	.extend({
		id: z.string().min(1, 'ID is required'),
	});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// Filter Input
export const getAccountsSchema = z.object({
	type: z.nativeEnum(AccountType).optional(),
});

export type GetAccountsInput = z.infer<typeof getAccountsSchema>;

export const adjustBalanceSchema = z.object({
	accountId: z.string().min(1, 'Account ID is required'),
	newBalance: z.number(),
});

export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
