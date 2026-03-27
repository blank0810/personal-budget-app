import { z } from 'zod';

const lineItemSchema = z.object({
	description: z.string().min(1, 'Description is required'),
	quantity: z.number().positive('Quantity must be positive').default(1),
	unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

export const createInvoiceSchema = z.object({
	clientName: z.string().min(1, 'Client name is required').max(200),
	clientEmail: z.string().email().optional().or(z.literal('')),
	clientAddress: z.string().optional(),
	clientPhone: z.string().optional(),
	issueDate: z.coerce.date(),
	dueDate: z.coerce.date(),
	taxRate: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
	lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
	id: z.string(),
});

export const markAsPaidSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string().min(1, 'Account is required'),
	categoryId: z.string().optional(),
	date: z.coerce.date().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;

export const getInvoicesSchema = z.object({
	status: z
		.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])
		.optional(),
	clientName: z.string().optional(),
	clientId: z.string().optional(),
});

export type GetInvoicesInput = z.infer<typeof getInvoicesSchema>;

export const generateFromEntriesSchema = z.object({
	clientId: z.string().min(1, 'Client is required'),
	workEntryIds: z.array(z.string()).min(1, 'Select at least one entry'),
	issueDate: z.coerce.date(),
	dueDate: z.coerce.date(),
	taxRate: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
});

export type GenerateFromEntriesInput = z.infer<
	typeof generateFromEntriesSchema
>;
