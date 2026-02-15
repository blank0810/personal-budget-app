'use server';

import { auth } from '@/auth';
import { PaymentService } from './payment.service';
import { createPaymentSchema } from './payment.types';
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
 * Server Action: Create Payment
 */
export async function createPaymentAction(formData: FormData) {
	const userId = await getAuthenticatedUser();

	const rawData = {
		amount: Number(formData.get('amount')),
		date: new Date(formData.get('date') as string),
		description: formData.get('description') as string,
		fee: formData.get('fee') ? Number(formData.get('fee')) : 0,
		fromAccountId: formData.get('fromAccountId') as string,
		toLiabilityId: formData.get('toLiabilityId') as string,
	};

	const validatedFields = createPaymentSchema.safeParse(rawData);

	if (!validatedFields.success) {
		return {
			error: 'Invalid fields',
			issues: validatedFields.error.issues,
		};
	}

	try {
		await PaymentService.createPayment(userId, validatedFields.data);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to create payment:', error);
		const message = error instanceof Error ? error.message : 'Failed to create payment';
		return { error: message };
	}
}

/**
 * Server Action: Delete Payment
 */
export async function deletePaymentAction(paymentId: string) {
	const userId = await getAuthenticatedUser();

	try {
		await PaymentService.deletePayment(userId, paymentId);
		revalidatePath('/', 'layout');
		return { success: true };
	} catch (error) {
		console.error('Failed to delete payment:', error);
		const message = error instanceof Error ? error.message : 'Failed to delete payment';
		return { error: message };
	}
}
