import { z } from 'zod';

// Payment Schema - for paying off liabilities from asset accounts
export const createPaymentSchema = z
	.object({
		amount: z.number().positive('Amount must be positive'),
		date: z.date(),
		description: z.string().optional(),
		fee: z.number().min(0).optional(),
		fromAccountId: z.string().min(1, 'Source account is required'),
		toLiabilityId: z.string().min(1, 'Liability account is required'),
	})
	.refine((data) => data.fromAccountId !== data.toLiabilityId, {
		message: 'Source and destination accounts must be different',
		path: ['toLiabilityId'],
	});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// Filter Input for fetching payments
export const getPaymentsSchema = z.object({
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	liabilityId: z.string().optional(), // Filter by specific liability
});

export type GetPaymentsInput = z.infer<typeof getPaymentsSchema>;
