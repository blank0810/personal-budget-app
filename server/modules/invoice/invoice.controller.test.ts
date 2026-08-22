import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	create: vi.fn(),
	markAsSent: vi.fn(),
	markAsPaid: vi.fn(),
	invalidateTags: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./invoice.service', () => ({
	InvoiceService: {
		create: mocks.create,
		markAsSent: mocks.markAsSent,
		markAsPaid: mocks.markAsPaid,
	},
}));

vi.mock('@/server/actions/cache', () => ({
	invalidateTags: mocks.invalidateTags,
}));

import {
	createInvoiceAction,
	markAsPaidAction,
	markAsSentAction,
} from './invoice.controller';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getAuthenticatedUser.mockResolvedValue('user-1');
	mocks.create.mockResolvedValue({ id: 'invoice-1' });
	mocks.markAsSent.mockResolvedValue({
		invoice: { id: 'invoice-1' },
		emailedTo: null,
		emailWarning: null,
	});
	mocks.markAsPaid.mockResolvedValue({
		invoice: { id: 'invoice-1' },
		emailedTo: null,
		emailWarning: 'Receipt delivery failed',
	});
});

describe('invoice create action', () => {
	it('accepts a company-only billed party', async () => {
		const data = {
			companyName: 'Acme Co',
			issueDate: new Date('2026-08-01T00:00:00.000Z'),
			dueDate: new Date('2026-08-31T00:00:00.000Z'),
			lineItems: [
				{ description: 'Consulting', quantity: 1, unitPrice: 100 },
			],
		};

		await expect(createInvoiceAction(data)).resolves.toEqual({
			success: true,
			data: { id: 'invoice-1' },
		});
		expect(mocks.create).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ companyName: 'Acme Co' })
		);
	});

	it('rejects blank company and contact names before calling the service', async () => {
		const result = await createInvoiceAction({
			companyName: ' ',
			clientName: '',
			issueDate: new Date('2026-08-01T00:00:00.000Z'),
			dueDate: new Date('2026-08-31T00:00:00.000Z'),
			lineItems: [
				{ description: 'Consulting', quantity: 1, unitPrice: 100 },
			],
		});

		expect(result).toEqual({
			error: 'Company name or contact name is required',
		});
		expect(mocks.create).not.toHaveBeenCalled();
	});
});

describe('invoice transition actions', () => {
	it('defaults sent email to false and returns delivery metadata', async () => {
		await expect(
			markAsSentAction({ invoiceId: 'invoice-1' })
		).resolves.toEqual({
			success: true,
			emailedTo: null,
			emailWarning: null,
		});
		expect(mocks.markAsSent).toHaveBeenCalledWith('user-1', {
			invoiceId: 'invoice-1',
			sendEmail: false,
		});
		expect(mocks.invalidateTags).toHaveBeenCalledWith('invoices');
	});

	it('rejects an invalid sent email choice before calling the service', async () => {
		const result = await markAsSentAction({
			invoiceId: 'invoice-1',
			sendEmail: 'yes',
		});

		expect(result).toHaveProperty('error');
		expect(mocks.markAsSent).not.toHaveBeenCalled();
	});

	it('returns paid delivery warnings and invalidates only invoices', async () => {
		await expect(
			markAsPaidAction({
				invoiceId: 'invoice-1',
				date: new Date('2026-08-17T00:00:00.000Z'),
			})
		).resolves.toEqual({
			success: true,
			emailedTo: null,
			emailWarning: 'Receipt delivery failed',
		});
		expect(mocks.markAsPaid).toHaveBeenCalledWith(
			'user-1',
			expect.objectContaining({ sendEmail: false })
		);
		expect(mocks.invalidateTags).toHaveBeenCalledTimes(1);
		expect(mocks.invalidateTags).toHaveBeenCalledWith('invoices');
	});
});
