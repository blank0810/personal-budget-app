import { z } from 'zod';

export const createClientSchema = z.object({
	name: z.string().min(1, 'Client name is required').max(200),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().optional(),
	address: z.string().optional(),
	defaultRate: z.number().min(0).optional(),
	currency: z
		.string()
		.length(3, 'Currency must be a 3-letter code')
		.toUpperCase()
		.optional(),
	notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
	id: z.string(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
