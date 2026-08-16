import { describe, expect, it } from 'vitest';
import { markAsPaidSchema, markAsSentSchema } from './invoice.types';

describe('invoice transition schemas', () => {
	it('defaults paid receipt delivery to false', () => {
		expect(
			markAsPaidSchema.parse({
				invoiceId: 'invoice-1',
				date: new Date('2026-08-17T00:00:00.000Z'),
			})
		).toEqual({
			invoiceId: 'invoice-1',
			date: new Date('2026-08-17T00:00:00.000Z'),
			sendEmail: false,
		});
	});

	it('defaults sent invoice delivery to false', () => {
		expect(markAsSentSchema.parse({ invoiceId: 'invoice-1' })).toEqual({
			invoiceId: 'invoice-1',
			sendEmail: false,
		});
	});

	it('rejects a non-boolean sent email choice', () => {
		expect(
			markAsSentSchema.safeParse({
				invoiceId: 'invoice-1',
				sendEmail: 'yes',
			}).success
		).toBe(false);
	});
});
