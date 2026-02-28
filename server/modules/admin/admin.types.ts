import { z } from 'zod';

export const adminReauthSchema = z.object({
	password: z.string().min(6),
});
