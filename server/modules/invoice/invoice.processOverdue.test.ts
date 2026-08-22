import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	findMany: vi.fn(),
	updateMany: vi.fn(),
	sendDigest: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		invoice: { findMany: mocks.findMany, updateMany: mocks.updateMany },
	},
}));

vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: { sendInvoiceOverdueDigest: mocks.sendDigest },
}));

vi.mock('@/server/modules/email/email.service', () => ({
	EmailService: {
		sendInvoice: vi.fn(),
		sendInvoiceReceipt: vi.fn(),
		send: vi.fn(),
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getCurrency: vi.fn() },
}));

vi.mock('@/lib/qr', () => ({ urlToQrDataUri: vi.fn() }));
vi.mock('./invoice.templates', () => ({ renderInvoicePDF: vi.fn() }));

const { InvoiceService } = await import('./invoice.service');

function candidate(id: string, userId = 'u1') {
	return {
		id,
		userId,
		invoiceNumber: `INV-${id}`,
		companyName: null,
		clientName: 'Acme Co',
		totalAmount: 100,
		dueDate: new Date('2026-08-01'),
	};
}

describe('InvoiceService.processOverdue', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.sendDigest.mockResolvedValue(undefined);
	});

	it('does nothing when no invoice has lapsed', async () => {
		mocks.findMany.mockResolvedValue([]);

		await expect(InvoiceService.processOverdue()).resolves.toEqual({
			processed: 0,
		});
		expect(mocks.updateMany).not.toHaveBeenCalled();
		expect(mocks.sendDigest).not.toHaveBeenCalled();
	});

	it('keeps the SENT guard on the update, so a just-paid invoice is not flipped back', async () => {
		mocks.findMany
			.mockResolvedValueOnce([candidate('a'), candidate('b')])
			.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
		mocks.updateMany.mockResolvedValue({ count: 2 });

		await InvoiceService.processOverdue();

		// Narrowing to `id IN (...)` alone would resurrect an invoice the user paid
		// between the select and the update.
		expect(mocks.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ['a', 'b'] }, status: 'SENT' },
			data: { status: 'OVERDUE' },
		});
	});

	it('does not email about an invoice that was paid mid-run', async () => {
		// 'b' was paid between the select and the update, so only 'a' flipped.
		mocks.findMany
			.mockResolvedValueOnce([candidate('a'), candidate('b')])
			.mockResolvedValueOnce([{ id: 'a' }]);
		mocks.updateMany.mockResolvedValue({ count: 1 });

		await InvoiceService.processOverdue();

		expect(mocks.sendDigest).toHaveBeenCalledOnce();
		const [, invoices] = mocks.sendDigest.mock.calls[0];
		expect(invoices).toHaveLength(1);
		expect(invoices[0].invoiceNumber).toBe('INV-a');
	});

	it('sends one digest per owner, not one per invoice', async () => {
		mocks.findMany
			.mockResolvedValueOnce([
				candidate('a', 'u1'),
				candidate('b', 'u1'),
				candidate('c', 'u2'),
			])
			.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
		mocks.updateMany.mockResolvedValue({ count: 3 });

		await InvoiceService.processOverdue();

		expect(mocks.sendDigest).toHaveBeenCalledTimes(2);
		const byUser = Object.fromEntries(
			mocks.sendDigest.mock.calls.map(([userId, invoices]) => [
				userId,
				invoices.length,
			])
		);
		expect(byUser).toEqual({ u1: 2, u2: 1 });
	});

	it('reports the count the database actually changed', async () => {
		mocks.findMany
			.mockResolvedValueOnce([candidate('a'), candidate('b')])
			.mockResolvedValueOnce([{ id: 'a' }]);
		mocks.updateMany.mockResolvedValue({ count: 1 });

		await expect(InvoiceService.processOverdue()).resolves.toEqual({
			processed: 1,
		});
	});

	it('still flips invoices when the notification throws', async () => {
		mocks.findMany
			.mockResolvedValueOnce([candidate('a')])
			.mockResolvedValueOnce([{ id: 'a' }]);
		mocks.updateMany.mockResolvedValue({ count: 1 });
		mocks.sendDigest.mockRejectedValue(new Error('provider down'));

		// Fire-and-forget: a failed digest must never fail the status transition.
		await expect(InvoiceService.processOverdue()).resolves.toEqual({
			processed: 1,
		});
	});
});
