'use server';

import { auth } from '@/auth';
import { AccountService } from './account.service';
import { createAccountSchema, updateAccountSchema } from './account.types';
import { revalidatePath } from 'next/cache';
import { AccountType } from '@prisma/client';

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

	const rawData = {
		name: formData.get('name') as string,
		type: formData.get('type') as AccountType,
		balance: Number(formData.get('balance')),
		isDefault: formData.get('isDefault') === 'on',
		isLiability: formData.get('isLiability') === 'on',
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

	const rawData = {
		id: formData.get('id') as string,
		name: formData.get('name') as string,
		type: formData.get('type') as AccountType,
		balance: Number(formData.get('balance')),
		isDefault: formData.get('isDefault') === 'on',
		isLiability: formData.get('isLiability') === 'on',
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
