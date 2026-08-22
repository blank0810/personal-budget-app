import { describe, expect, it } from 'vitest';
import {
	createInvoiceSchema,
	markAsPaidSchema,
	markAsSentSchema,
	updateInvoiceSchema,
} from './invoice.types';

const validInvoice = {
	issueDate: new Date('2026-08-01T00:00:00.000Z'),
	dueDate: new Date('2026-08-31T00:00:00.000Z'),
	lineItems: [{ description: 'Consulting', quantity: 1, unitPrice: 100 }],
};

describe('invoice party schemas', () => {
	it('accepts a company name without a contact name', () => {
		expect(
			createInvoiceSchema.safeParse({
				...validInvoice,
				companyName: 'Acme Co',
				clientName: '',
			}).success
		).toBe(true);
	});

	it('rejects both names blank on create', () => {
		const result = createInvoiceSchema.safeParse({
			...validInvoice,
			companyName: '   ',
			clientName: '',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]).toMatchObject({
				message: 'Company name or contact name is required',
				path: ['companyName'],
			});
		}
	});

	it('allows a partial update that omits one of the name keys', () => {
		expect(
			updateInvoiceSchema.safeParse({ id: 'invoice-1', companyName: '' })
				.success
		).toBe(true);
	});

	it('rejects an update that explicitly blanks both names', () => {
		expect(
			updateInvoiceSchema.safeParse({
				id: 'invoice-1',
				companyName: '',
				clientName: ' ',
			}).success
		).toBe(false);
	});
});

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
