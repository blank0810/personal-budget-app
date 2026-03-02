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

export const updateAccountSchema = createAccountSchema.partial().extend({
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
