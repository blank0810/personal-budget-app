'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { PaymentService } from './payment.service';
import { createPaymentSchema } from './payment.types';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import { coerceDateFields } from '@/server/lib/action-utils';

/**
 * Server Action: Create Payment
 */
export async function createPaymentAction(data: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = createPaymentSchema.safeParse(coerceDateFields(data));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		await PaymentService.createPayment(userId, parsed.data);
		invalidateTags(CACHE_TAGS.PAYMENTS, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
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
		invalidateTags(CACHE_TAGS.PAYMENTS, CACHE_TAGS.ACCOUNTS, CACHE_TAGS.DASHBOARD);
		return { success: true as const };
	} catch (error) {
		console.error('Failed to delete payment:', error);
		const message = error instanceof Error ? error.message : 'Failed to delete payment';
		return { error: message };
	}
}
