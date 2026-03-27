import { z } from 'zod';

export const setCurrencySchema = z.object({
	currency: z
		.string()
		.length(3, 'Currency must be a 3-letter code')
		.toUpperCase(),
});

export type SetCurrencyInput = z.infer<typeof setCurrencySchema>;

export const completeOnboardingSchema = z.object({
	currency: z
		.string()
		.length(3, 'Currency must be a 3-letter code')
		.toUpperCase(),
	accounts: z
		.array(
			z.object({
				name: z.string().min(1, 'Account name is required'),
				type: z.string(),
				balance: z.number(),
			})
		)
		.optional(),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
