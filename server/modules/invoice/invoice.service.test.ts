import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { InvoiceStatus } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	events: [] as string[],
	invoiceFindUnique: vi.fn(),
	invoiceUpdate: vi.fn(),
	getCurrency: vi.fn(),
	sendInvoice: vi.fn(),
	sendInvoiceReceipt: vi.fn(),
	renderInvoicePDF: vi.fn(),
	urlToQrDataUri: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		invoice: {
			findUnique: mocks.invoiceFindUnique,
			update: mocks.invoiceUpdate,
		},
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getCurrency: mocks.getCurrency },
}));

vi.mock('@/server/modules/email/email.service', () => ({
	EmailService: {
		sendInvoice: mocks.sendInvoice,
		sendInvoiceReceipt: mocks.sendInvoiceReceipt,
	},
}));

vi.mock('./invoice.templates', () => ({
	renderInvoicePDF: mocks.renderInvoicePDF,
}));

vi.mock('@/lib/qr', () => ({
	urlToQrDataUri: mocks.urlToQrDataUri,
}));

import { InvoiceService } from './invoice.service';

const SENT_EMAIL_WARNING =
	'Invoice was marked as sent, but the email could not be delivered. You can retry from this invoice.';
const SENT_EMAIL_MISSING_WARNING =
	'Invoice was marked as sent, but no client email is available. Add an email before retrying.';
const PAID_EMAIL_WARNING =
	'Invoice was marked as paid, but the receipt email could not be delivered. You can retry from this invoice.';
const PAID_EMAIL_MISSING_WARNING =
	'Invoice was marked as paid, but no client email is available. Add an email before retrying.';

function makeInvoice(
	status: InvoiceStatus,
	clientEmail: string | null = 'client@example.com'
) {
	return {
		id: 'invoice-1',
		invoiceNumber: 'INV-0001',
		status,
		clientName: 'Demo Client',
		clientEmail,
		clientAddress: null,
		clientPhone: null,
		currency: 'USD',
		issueDate: new Date('2026-08-01T00:00:00.000Z'),
		dueDate: new Date('2026-08-31T00:00:00.000Z'),
		subtotal: 100,
		taxRate: null,
		taxAmount: 0,
		totalAmount: 100,
		notes: null,
		paidAt: null,
		paymentLink: null,
		linkedIncomeId: null,
		clientId: null,
		userId: 'user-1',
		createdAt: new Date('2026-08-01T00:00:00.000Z'),
		updatedAt: new Date('2026-08-01T00:00:00.000Z'),
		lineItems: [
			{
				id: 'line-1',
				description: 'Consulting',
				quantity: 1,
				unitPrice: 100,
				amount: 100,
				date: null,
				sortOrder: 0,
				workEntryId: null,
				invoiceId: 'invoice-1',
				createdAt: new Date('2026-08-01T00:00:00.000Z'),
				updatedAt: new Date('2026-08-01T00:00:00.000Z'),
			},
		],
		user: {
			name: 'Demo User',
			email: 'demo@example.com',
			phoneNumber: null,
			businessName: null,
			businessAddress: null,
			businessTaxId: null,
			paymentInstructions: null,
		},
		linkedIncome: null,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.events.length = 0;
	mocks.getCurrency.mockResolvedValue('USD');
	mocks.urlToQrDataUri.mockResolvedValue(null);
	mocks.renderInvoicePDF.mockResolvedValue(Buffer.from('invoice-pdf'));
	mocks.invoiceUpdate.mockImplementation(
		async ({ data }: { data: { status: InvoiceStatus; paidAt?: Date } }) => {
			mocks.events.push(`update:${data.status}`);
			return { id: 'invoice-1', ...data };
		}
	);
	mocks.sendInvoice.mockImplementation(async () => {
		mocks.events.push('email:invoice');
		return { id: 'message-1' };
	});
	mocks.sendInvoiceReceipt.mockImplementation(async () => {
		mocks.events.push('email:receipt');
		return { id: 'message-2' };
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('InvoiceService.markAsSent', () => {
	it('records SENT without invoking email when delivery is not selected', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);

		const result = await InvoiceService.markAsSent('user-1', {
			invoiceId: 'invoice-1',
			sendEmail: false,
		});

		expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
			where: { id: 'invoice-1', userId: 'user-1' },
			data: { status: InvoiceStatus.SENT },
		});
		expect(mocks.sendInvoice).not.toHaveBeenCalled();
		expect(result.emailedTo).toBeNull();
		expect(result.emailWarning).toBeNull();
	});

	it('saves SENT before sending a selected invoice email', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);

		const result = await InvoiceService.markAsSent('user-1', {
			invoiceId: 'invoice-1',
			sendEmail: true,
		});

		expect(mocks.events).toEqual(['update:SENT', 'email:invoice']);
		expect(result.emailedTo).toBe('client@example.com');
		expect(result.emailWarning).toBeNull();
	});

	it('keeps SENT and returns a warning when selected delivery fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);
		mocks.sendInvoice.mockImplementation(async () => {
			mocks.events.push('email:invoice');
			throw new Error('SMTP unavailable');
		});

		await expect(
			InvoiceService.markAsSent('user-1', {
				invoiceId: 'invoice-1',
				sendEmail: true,
			})
		).resolves.toMatchObject({
			emailedTo: null,
			emailWarning: SENT_EMAIL_WARNING,
		});
		expect(mocks.events).toEqual(['update:SENT', 'email:invoice']);
	});

	it('keeps SENT and warns when selected delivery has no address', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT, null)
		);

		const result = await InvoiceService.markAsSent('user-1', {
			invoiceId: 'invoice-1',
			sendEmail: true,
		});

		expect(mocks.invoiceUpdate).toHaveBeenCalledOnce();
		expect(mocks.renderInvoicePDF).not.toHaveBeenCalled();
		expect(result.emailWarning).toBe(SENT_EMAIL_MISSING_WARNING);
	});

	it('does not email when the SENT database update fails', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);
		mocks.invoiceUpdate.mockRejectedValueOnce(
			new Error('Database unavailable')
		);

		await expect(
			InvoiceService.markAsSent('user-1', {
				invoiceId: 'invoice-1',
				sendEmail: true,
			})
		).rejects.toThrow('Database unavailable');
		expect(mocks.renderInvoicePDF).not.toHaveBeenCalled();
		expect(mocks.sendInvoice).not.toHaveBeenCalled();
	});

	it('rejects a non-DRAFT invoice before updating or emailing', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.SENT)
		);

		await expect(
			InvoiceService.markAsSent('user-1', {
				invoiceId: 'invoice-1',
				sendEmail: false,
			})
		).rejects.toThrow('Only DRAFT invoices can be marked as sent');
		expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
		expect(mocks.sendInvoice).not.toHaveBeenCalled();
	});
});
