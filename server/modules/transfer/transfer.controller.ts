'use server';

import { auth } from '@/auth';
import { TransferService } from './transfer.service';
import { createTransferSchema } from './transfer.types';
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
 * Server Action: Create Transfer
 */
export async function createTransferAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		amount: Number(formData.get('amount')),
		date: new Date(formData.get('date') as string),
		description: formData.get('description') as string,
		fromAccountId: formData.get('fromAccountId') as string,
		toAccountId: formData.get('toAccountId') as string,
	};

	const validatedFields = createTransferSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await TransferService.createTransfer(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to create transfer:', error);
		return { error: 'Failed to create transfer' };
	}
}

/**
 * Server Action: Delete Transfer
 */
export async function deleteTransferAction(transferId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await TransferService.deleteTransfer(userId, transferId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete transfer:', error);
		return { error: 'Failed to delete transfer' };
	}
}
