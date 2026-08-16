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

function makeRecordNotFoundError() {
	return Object.assign(new Error('Record to update not found'), {
		code: 'P2025',
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.events.length = 0;
	mocks.getCurrency.mockResolvedValue('USD');
	mocks.urlToQrDataUri.mockResolvedValue(null);
	mocks.renderInvoicePDF.mockImplementation(async () => {
		mocks.events.push('render:pdf');
		return Buffer.from('invoice-pdf');
	});
	mocks.invoiceUpdate.mockImplementation(
		async ({ data }: { data: { status: InvoiceStatus; paidAt?: Date } }) => {
			await Promise.resolve();
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
			where: {
				id: 'invoice-1',
				userId: 'user-1',
				status: InvoiceStatus.DRAFT,
			},
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

		expect(mocks.events).toEqual([
			'update:SENT',
			'render:pdf',
			'email:invoice',
		]);
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
		expect(mocks.events).toEqual([
			'update:SENT',
			'render:pdf',
			'email:invoice',
		]);
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

	it('allows only one concurrent SENT transition and delivery', async () => {
		let storedStatus = InvoiceStatus.DRAFT;
		mocks.invoiceFindUnique.mockImplementation(async () =>
			makeInvoice(storedStatus)
		);
		mocks.invoiceUpdate.mockImplementation(
			async ({
				where,
				data,
			}: {
				where: { status?: InvoiceStatus };
				data: { status: InvoiceStatus };
			}) => {
				if (where.status !== storedStatus) {
					throw makeRecordNotFoundError();
				}
				storedStatus = data.status;
				mocks.events.push(`update:${data.status}`);
				return { id: 'invoice-1', ...data };
			}
		);

		const results = await Promise.allSettled([
			InvoiceService.markAsSent('user-1', {
				invoiceId: 'invoice-1',
				sendEmail: true,
			}),
			InvoiceService.markAsSent('user-1', {
				invoiceId: 'invoice-1',
				sendEmail: true,
			}),
		]);

		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
		expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
		expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
			reason: new Error('Only DRAFT invoices can be marked as sent'),
		});
		expect(storedStatus).toBe(InvoiceStatus.SENT);
		expect(mocks.sendInvoice).toHaveBeenCalledOnce();
	});

	it.each([
		InvoiceStatus.SENT,
		InvoiceStatus.PAID,
		InvoiceStatus.OVERDUE,
		InvoiceStatus.CANCELLED,
	])('rejects %s before updating or emailing', async (status) => {
		mocks.invoiceFindUnique.mockResolvedValue(makeInvoice(status));

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

describe('InvoiceService.markAsPaid', () => {
	it('records PAID without invoking receipt email when delivery is off', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.SENT)
		);
		const paidAt = new Date('2026-08-17T00:00:00.000Z');

		const result = await InvoiceService.markAsPaid('user-1', {
			invoiceId: 'invoice-1',
			date: paidAt,
			sendEmail: false,
		});

		expect(mocks.invoiceUpdate).toHaveBeenCalledWith({
			where: {
				id: 'invoice-1',
				userId: 'user-1',
				status: {
					in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE],
				},
			},
			data: { status: InvoiceStatus.PAID, paidAt },
		});
		expect(mocks.sendInvoiceReceipt).not.toHaveBeenCalled();
		expect(result.emailedTo).toBeNull();
		expect(result.emailWarning).toBeNull();
	});

	it('saves PAID before sending a selected receipt', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.OVERDUE)
		);

		const result = await InvoiceService.markAsPaid('user-1', {
			invoiceId: 'invoice-1',
			date: new Date('2026-08-17T00:00:00.000Z'),
			sendEmail: true,
		});

		expect(mocks.events).toEqual([
			'update:PAID',
			'render:pdf',
			'email:receipt',
		]);
		expect(result.emailedTo).toBe('client@example.com');
		expect(result.emailWarning).toBeNull();
	});

	it('keeps PAID and returns a warning when receipt delivery fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.SENT)
		);
		mocks.sendInvoiceReceipt.mockImplementation(async () => {
			mocks.events.push('email:receipt');
			throw new Error('SMTP unavailable');
		});

		await expect(
			InvoiceService.markAsPaid('user-1', {
				invoiceId: 'invoice-1',
				date: new Date('2026-08-17T00:00:00.000Z'),
				sendEmail: true,
			})
		).resolves.toMatchObject({
			emailedTo: null,
			emailWarning: PAID_EMAIL_WARNING,
		});
		expect(mocks.events).toEqual([
			'update:PAID',
			'render:pdf',
			'email:receipt',
		]);
	});

	it('keeps PAID and warns when selected receipt delivery has no address', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.SENT, null)
		);

		const result = await InvoiceService.markAsPaid('user-1', {
			invoiceId: 'invoice-1',
			date: new Date('2026-08-17T00:00:00.000Z'),
			sendEmail: true,
		});

		expect(mocks.invoiceUpdate).toHaveBeenCalledOnce();
		expect(mocks.renderInvoicePDF).not.toHaveBeenCalled();
		expect(mocks.sendInvoiceReceipt).not.toHaveBeenCalled();
		expect(result.emailWarning).toBe(PAID_EMAIL_MISSING_WARNING);
	});

	it('allows only one concurrent PAID transition and receipt delivery', async () => {
		let storedStatus = InvoiceStatus.SENT;
		let storedPaidAt: Date | null = null;
		mocks.invoiceFindUnique.mockImplementation(async () =>
			makeInvoice(storedStatus)
		);
		mocks.invoiceUpdate.mockImplementation(
			async ({
				where,
				data,
			}: {
				where: {
					status?: InvoiceStatus | { in?: InvoiceStatus[] };
				};
				data: { status: InvoiceStatus; paidAt?: Date };
			}) => {
				const allowedStatuses =
					typeof where.status === 'object'
						? where.status.in ?? []
						: [where.status];
				if (!allowedStatuses.includes(storedStatus)) {
					throw makeRecordNotFoundError();
				}
				storedStatus = data.status;
				storedPaidAt = data.paidAt ?? null;
				mocks.events.push(`update:${data.status}`);
				return { id: 'invoice-1', ...data };
			}
		);
		const firstPaidAt = new Date('2026-08-17T00:00:00.000Z');
		const secondPaidAt = new Date('2026-08-18T00:00:00.000Z');

		const results = await Promise.allSettled([
			InvoiceService.markAsPaid('user-1', {
				invoiceId: 'invoice-1',
				date: firstPaidAt,
				sendEmail: true,
			}),
			InvoiceService.markAsPaid('user-1', {
				invoiceId: 'invoice-1',
				date: secondPaidAt,
				sendEmail: true,
			}),
		]);

		expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
		expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
		expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
			reason: new Error(
				'Only SENT or OVERDUE invoices can be marked as paid'
			),
		});
		expect(storedStatus).toBe(InvoiceStatus.PAID);
		expect([firstPaidAt, secondPaidAt]).toContainEqual(storedPaidAt);
		expect(mocks.sendInvoiceReceipt).toHaveBeenCalledOnce();
	});

	it.each([
		InvoiceStatus.DRAFT,
		InvoiceStatus.PAID,
		InvoiceStatus.CANCELLED,
	])('rejects %s before updating or emailing', async (status) => {
		mocks.invoiceFindUnique.mockResolvedValue(makeInvoice(status));

		await expect(
			InvoiceService.markAsPaid('user-1', {
				invoiceId: 'invoice-1',
				date: new Date('2026-08-17T00:00:00.000Z'),
				sendEmail: false,
			})
		).rejects.toThrow('Only SENT or OVERDUE invoices can be marked as paid');
		expect(mocks.invoiceUpdate).not.toHaveBeenCalled();
		expect(mocks.sendInvoiceReceipt).not.toHaveBeenCalled();
	});
});
