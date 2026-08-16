# Optional Invoice Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users record invoices as sent and paid without automatically emailing clients, while retaining explicit opt-in invoice and receipt delivery through the existing email provider.

**Architecture:** Add validated `sendEmail: false` defaults at the controller boundary, persist invoice status before any optional external delivery, and return a non-sensitive delivery warning without rolling back successful bookkeeping. Add a focused sent-confirmation dialog and reset both dialog checkboxes on close so every email is an explicit choice.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Zod 4, Prisma 5, Vitest 4, shadcn/ui, Sonner, Docker Compose

## Global Constraints

- The invoice lifecycle remains `DRAFT -> SENT -> PAID`; a `DRAFT` invoice cannot become `PAID` directly.
- `OVERDUE` invoices remain eligible to become `PAID`.
- The existing Gmail/Nodemailer email transport remains unchanged.
- No shared email-service, feature-request, dependency, lockfile, Docker, environment configuration, Prisma schema, or migration changes are allowed.
- Every invoice and receipt email checkbox must start unchecked and reset to unchecked whenever its dialog closes.
- A successful status transition must remain saved when optional PDF rendering or email delivery fails.
- Every UI request must continue through the invoice controller before reaching the invoice service.
- Do not embed maintainer names, personal emails, or other personal information in code, fixtures, UI copy, or documentation.
- Run project commands through Docker Compose.
- Work directly on `main`; do not create a branch or PR. Never force-push or rewrite pushed history.
- Do not run `prisma db seed`, `prisma migrate reset`, or any production database command for this ticket.

## File Map

- Create `server/modules/invoice/invoice.types.test.ts` for transition-schema defaults and validation.
- Create `server/modules/invoice/invoice.service.test.ts` for status, ordering, opt-in delivery, warning, and lifecycle behavior.
- Create `server/modules/invoice/invoice.controller.test.ts` for action-boundary validation, forwarding, warning propagation, and cache invalidation.
- Create `components/modules/invoice/MarkAsSentDialog.tsx` for the explicit sent confirmation and optional email choice.
- Modify `server/modules/invoice/invoice.types.ts` to add `MarkAsSentInput` and default both email flags to false.
- Modify `server/modules/invoice/invoice.service.ts` to save state before best-effort optional delivery.
- Modify `server/modules/invoice/invoice.controller.ts` to validate the sent payload and return delivery warnings.
- Modify `components/modules/invoice/MarkAsPaidDialog.tsx` to default/reset receipt email to false and show warnings.
- Modify `components/modules/invoice/InvoiceDetail.tsx` to open the sent dialog instead of sending immediately.

---

### Task 1: Define Safe Transition Input Contracts

**Files:**
- Create: `server/modules/invoice/invoice.types.test.ts`
- Modify: `server/modules/invoice/invoice.types.ts:42-50`

**Interfaces:**
- Produces: `markAsSentSchema`, `MarkAsSentInput`, and `MarkAsPaidInput` with parsed `sendEmail: boolean` values that default to `false`.
- Consumes: Zod 4, already used by `invoice.types.ts`.

- [ ] **Step 1: Write the failing paid-email default test**

Create `server/modules/invoice/invoice.types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { markAsPaidSchema } from './invoice.types';

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
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.types.test.ts
```

Expected: FAIL because the parsed paid payload omits `sendEmail`.

- [ ] **Step 3: Default the paid flag to false**

Replace the paid schema with:

```ts
export const markAsPaidSchema = z.object({
	invoiceId: z.string(),
	date: z.coerce.date().optional(),
	sendEmail: z.boolean().default(false),
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.types.test.ts
```

Expected: PASS with 1 test.

- [ ] **Step 5: Add failing sent-payload tests**

Change the import to:

```ts
import { markAsPaidSchema, markAsSentSchema } from './invoice.types';
```

Add inside the existing `describe` block:

```ts
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
```

- [ ] **Step 6: Run the focused test and verify RED**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.types.test.ts
```

Expected: FAIL because `markAsSentSchema` is not exported.

- [ ] **Step 7: Add the sent schema and exported input type**

Place this immediately before `markAsPaidSchema`:

```ts
export const markAsSentSchema = z.object({
	invoiceId: z.string(),
	sendEmail: z.boolean().default(false),
});
```

Update the transition type exports to:

```ts
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type MarkAsSentInput = z.infer<typeof markAsSentSchema>;
export type MarkAsPaidInput = z.infer<typeof markAsPaidSchema>;
```

- [ ] **Step 8: Run the focused test and verify GREEN**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.types.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 9: Commit the input contract**

```bash
git add server/modules/invoice/invoice.types.ts server/modules/invoice/invoice.types.test.ts
git commit -m "test(invoice): default transition emails to off"
```

---

### Task 2: Persist SENT Before Optional Delivery

**Files:**
- Create: `server/modules/invoice/invoice.service.test.ts`
- Modify: `server/modules/invoice/invoice.service.ts:3-10,498-551`

**Interfaces:**
- Consumes: `MarkAsSentInput` from Task 1 and existing `EmailService.sendInvoice`.
- Produces: `InvoiceService.markAsSent(userId, data)` returning `{ invoice, emailedTo, emailWarning }`.

- [ ] **Step 1: Create the invoice-service test harness**

Create `server/modules/invoice/invoice.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);
		mocks.sendInvoice.mockImplementation(async () => {
			mocks.events.push('email:invoice');
			throw new Error('SMTP unavailable');
		});

		const result = await InvoiceService.markAsSent('user-1', {
			invoiceId: 'invoice-1',
			sendEmail: true,
		});

		expect(mocks.events).toEqual(['update:SENT', 'email:invoice']);
		expect(result.emailedTo).toBeNull();
		expect(result.emailWarning).toBe(SENT_EMAIL_WARNING);
		consoleError.mockRestore();
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
```

- [ ] **Step 2: Run the sent-service tests and verify RED**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.service.test.ts
```

Expected: FAIL because `markAsSent` still accepts a string, emails automatically, sends before updating, and does not return `emailWarning`.

- [ ] **Step 3: Import the sent input and define stable warning copy**

Add `MarkAsSentInput` to the existing type import:

```ts
import {
	CreateInvoiceInput,
	UpdateInvoiceInput,
	MarkAsSentInput,
	MarkAsPaidInput,
	GetInvoicesInput,
	GenerateFromEntriesInput,
	InvoiceSummary,
} from './invoice.types';
```

Immediately below the imports, add:

```ts
const SENT_EMAIL_WARNING =
	'Invoice was marked as sent, but the email could not be delivered. You can retry from this invoice.';
const SENT_EMAIL_MISSING_WARNING =
	'Invoice was marked as sent, but no client email is available. Add an email before retrying.';
const PAID_EMAIL_WARNING =
	'Invoice was marked as paid, but the receipt email could not be delivered. You can retry from this invoice.';
const PAID_EMAIL_MISSING_WARNING =
	'Invoice was marked as paid, but no client email is available. Add an email before retrying.';
```

- [ ] **Step 4: Replace `markAsSent` with state-first, best-effort delivery**

Replace the complete current `markAsSent` method with:

```ts
	/**
	 * Transition a DRAFT invoice to SENT, then optionally email its PDF.
	 * Delivery failure never rolls back the successful status transition.
	 */
	async markAsSent(userId: string, data: MarkAsSentInput) {
		const invoice = await prisma.invoice.findUnique({
			where: { id: data.invoiceId, userId },
			include: {
				lineItems: { orderBy: { sortOrder: 'asc' } },
				user: {
					select: {
						name: true,
						email: true,
						phoneNumber: true,
						businessName: true,
						businessAddress: true,
						businessTaxId: true,
						paymentInstructions: true,
					},
				},
			},
		});

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (invoice.status !== InvoiceStatus.DRAFT) {
			throw new Error('Only DRAFT invoices can be marked as sent');
		}

		const updated = await prisma.invoice.update({
			where: { id: data.invoiceId, userId },
			data: { status: InvoiceStatus.SENT },
		});

		let emailedTo: string | null = null;
		let emailWarning: string | null = null;

		if (data.sendEmail) {
			if (!invoice.clientEmail) {
				emailWarning = SENT_EMAIL_MISSING_WARNING;
			} else {
				try {
					const currency =
						invoice.currency || (await UserService.getCurrency(userId));
					emailedTo = await emailInvoiceToClient(invoice, currency, {
						status: InvoiceStatus.SENT,
						paidAt: null,
						variant: 'invoice',
					});
				} catch (error) {
					console.error(
						'Invoice marked as sent, but email delivery failed:',
						error
					);
					emailWarning = SENT_EMAIL_WARNING;
				}
			}
		}

		return { invoice: updated, emailedTo, emailWarning };
	},
```

- [ ] **Step 5: Run the sent-service tests and verify GREEN**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.service.test.ts
```

Expected: PASS with 6 sent-transition tests.

- [ ] **Step 6: Commit the sent transition**

```bash
git add server/modules/invoice/invoice.service.ts server/modules/invoice/invoice.service.test.ts
git commit -m "feat(invoice): make sent email optional"
```

---

### Task 3: Persist PAID Before Optional Receipt Delivery

**Files:**
- Modify: `server/modules/invoice/invoice.service.test.ts`
- Modify: `server/modules/invoice/invoice.service.ts:553-621`

**Interfaces:**
- Consumes: `MarkAsPaidInput` with a required parsed boolean from Task 1 and the test harness from Task 2.
- Produces: `InvoiceService.markAsPaid(userId, data)` returning `{ invoice, emailedTo, emailWarning }` while retaining the `SENT | OVERDUE` guard.

- [ ] **Step 1: Add paid-transition regression tests**

Append to `server/modules/invoice/invoice.service.test.ts`:

```ts
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
			where: { id: 'invoice-1', userId: 'user-1' },
			data: { status: InvoiceStatus.PAID, paidAt },
		});
		expect(mocks.sendInvoiceReceipt).not.toHaveBeenCalled();
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

		expect(mocks.events).toEqual(['update:PAID', 'email:receipt']);
		expect(result.emailedTo).toBe('client@example.com');
		expect(result.emailWarning).toBeNull();
	});

	it('keeps PAID and returns a warning when receipt delivery fails', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.SENT)
		);
		mocks.sendInvoiceReceipt.mockImplementation(async () => {
			mocks.events.push('email:receipt');
			throw new Error('SMTP unavailable');
		});

		const result = await InvoiceService.markAsPaid('user-1', {
			invoiceId: 'invoice-1',
			date: new Date('2026-08-17T00:00:00.000Z'),
			sendEmail: true,
		});

		expect(mocks.events).toEqual(['update:PAID', 'email:receipt']);
		expect(result.emailedTo).toBeNull();
		expect(result.emailWarning).toBe(PAID_EMAIL_WARNING);
		consoleError.mockRestore();
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

	it('rejects a DRAFT invoice before updating or emailing', async () => {
		mocks.invoiceFindUnique.mockResolvedValue(
			makeInvoice(InvoiceStatus.DRAFT)
		);

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
```

- [ ] **Step 2: Run the invoice-service tests and verify RED**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.service.test.ts
```

Expected: FAIL because the current paid method sends before updating and throws on receipt failure instead of returning `emailWarning`.

- [ ] **Step 3: Replace `markAsPaid` with state-first, best-effort delivery**

Replace the complete current `markAsPaid` method with:

```ts
	/**
	 * Transition a SENT or OVERDUE invoice to PAID, then optionally email its receipt.
	 * Delivery failure never rolls back the successful status transition.
	 */
	async markAsPaid(userId: string, data: MarkAsPaidInput) {
		const invoice = await prisma.invoice.findUnique({
			where: { id: data.invoiceId, userId },
			include: {
				lineItems: { orderBy: { sortOrder: 'asc' } },
				user: {
					select: {
						name: true,
						email: true,
						phoneNumber: true,
						businessName: true,
						businessAddress: true,
						businessTaxId: true,
						paymentInstructions: true,
					},
				},
				linkedIncome: {
					include: { account: { select: { name: true } } },
				},
			},
		});

		if (!invoice) {
			throw new Error('Invoice not found');
		}

		if (
			invoice.status !== InvoiceStatus.SENT &&
			invoice.status !== InvoiceStatus.OVERDUE
		) {
			throw new Error('Only SENT or OVERDUE invoices can be marked as paid');
		}

		const paidAt = data.date ?? new Date();
		const updated = await prisma.invoice.update({
			where: { id: data.invoiceId, userId },
			data: { status: InvoiceStatus.PAID, paidAt },
		});

		let emailedTo: string | null = null;
		let emailWarning: string | null = null;

		if (data.sendEmail) {
			if (!invoice.clientEmail) {
				emailWarning = PAID_EMAIL_MISSING_WARNING;
			} else {
				try {
					const currency =
						invoice.currency || (await UserService.getCurrency(userId));
					emailedTo = await emailInvoiceToClient(
						{ ...invoice, paidAt },
						currency,
						{
							status: InvoiceStatus.PAID,
							paidAt,
							variant: 'receipt',
						}
					);
				} catch (error) {
					console.error(
						'Invoice marked as paid, but receipt delivery failed:',
						error
					);
					emailWarning = PAID_EMAIL_WARNING;
				}
			}
		}

		return { invoice: updated, emailedTo, emailWarning };
	},
```

- [ ] **Step 4: Run the invoice-service tests and verify GREEN**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.service.test.ts
```

Expected: PASS with 11 transition tests.

- [ ] **Step 5: Commit the paid transition**

```bash
git add server/modules/invoice/invoice.service.ts server/modules/invoice/invoice.service.test.ts
git commit -m "feat(invoice): preserve paid status on email failure"
```

---

### Task 4: Validate Controller Payloads and Propagate Warnings

**Files:**
- Create: `server/modules/invoice/invoice.controller.test.ts`
- Modify: `server/modules/invoice/invoice.controller.ts:5-12,62-107`

**Interfaces:**
- Consumes: transition schemas from Task 1 and service results from Tasks 2-3.
- Produces: `markAsSentAction(data: unknown)` and `markAsPaidAction(data: unknown)` returning `{ success: true, emailedTo, emailWarning }` on a saved transition.

- [ ] **Step 1: Write controller-boundary tests**

Create `server/modules/invoice/invoice.controller.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	markAsSent: vi.fn(),
	markAsPaid: vi.fn(),
	invalidateTags: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./invoice.service', () => ({
	InvoiceService: {
		markAsSent: mocks.markAsSent,
		markAsPaid: mocks.markAsPaid,
	},
}));

vi.mock('@/server/actions/cache', () => ({
	invalidateTags: mocks.invalidateTags,
}));

import { markAsPaidAction, markAsSentAction } from './invoice.controller';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getAuthenticatedUser.mockResolvedValue('user-1');
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
```

- [ ] **Step 2: Run the controller tests and verify RED**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.controller.test.ts
```

Expected: FAIL because `markAsSentAction` accepts a string, warnings are not returned, and the paid action invalidates unrelated tags.

- [ ] **Step 3: Validate the sent action and return warning metadata**

Add `markAsSentSchema` to the controller imports:

```ts
import {
	createInvoiceSchema,
	updateInvoiceSchema,
	markAsSentSchema,
	markAsPaidSchema,
	generateFromEntriesSchema,
} from './invoice.types';
```

Replace `markAsSentAction` with:

```ts
export async function markAsSentAction(data: unknown) {
	const userId = await getAuthenticatedUser();
	const parsed = markAsSentSchema.safeParse(data);

	if (!parsed.success) {
		return {
			error: parsed.error.issues[0]?.message || 'Validation failed',
		};
	}

	try {
		const { emailedTo, emailWarning } = await InvoiceService.markAsSent(
			userId,
			parsed.data
		);
		invalidateTags(CACHE_TAGS.INVOICES);
		return { success: true as const, emailedTo, emailWarning };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to mark invoice as sent',
		};
	}
}
```

- [ ] **Step 4: Return paid warning metadata and narrow cache invalidation**

Replace only the paid action's successful `try` body with:

```ts
	try {
		const { emailedTo, emailWarning } = await InvoiceService.markAsPaid(
			userId,
			parsed.data
		);
		invalidateTags(CACHE_TAGS.INVOICES);
		return { success: true as const, emailedTo, emailWarning };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: 'Failed to mark invoice as paid',
		};
	}
```

- [ ] **Step 5: Run controller and service tests and verify GREEN**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.controller.test.ts server/modules/invoice/invoice.service.test.ts server/modules/invoice/invoice.types.test.ts
```

Expected: PASS with 17 tests.

- [ ] **Step 6: Commit the controller contract**

```bash
git add server/modules/invoice/invoice.controller.ts server/modules/invoice/invoice.controller.test.ts
git commit -m "feat(invoice): expose optional email results"
```

---

### Task 5: Add Explicit Opt-In Dialogs

**Files:**
- Create: `components/modules/invoice/MarkAsSentDialog.tsx`
- Modify: `components/modules/invoice/MarkAsPaidDialog.tsx:1-124`
- Modify: `components/modules/invoice/InvoiceDetail.tsx:1-25,424-450,521-536,657-663`

**Interfaces:**
- Consumes: `markAsSentAction({ invoiceId, sendEmail })` and `markAsPaidAction({ invoiceId, date, sendEmail })` from Task 4.
- Produces: sent and paid dialogs whose email checkboxes are false on first open and after every close.

The current Vitest setup is Node-only and the repository has no DOM component-test library. Because this ticket prohibits dependency and lockfile changes, the thin dialog wiring is verified through lint, a production build, and the explicit keyboard/state checks in Step 6 rather than a new browser-test dependency.

- [ ] **Step 1: Invoke the frontend design skill before UI work**

Read `/home/blank/.codex/skills/impeccable/SKILL.md` completely and apply its accessibility, dialog, copy, and pending-state guidance without redesigning unrelated invoice UI.

- [ ] **Step 2: Create the sent confirmation dialog**

Create `components/modules/invoice/MarkAsSentDialog.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { markAsSentAction } from '@/server/modules/invoice/invoice.controller';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MarkAsSentDialogProps {
	invoiceId: string;
	clientEmail?: string | null;
	open: boolean;
	onSuccess: () => void;
	onClose: () => void;
}

export function MarkAsSentDialog({
	invoiceId,
	clientEmail,
	open,
	onSuccess,
	onClose,
}: MarkAsSentDialogProps) {
	const [isPending, startTransition] = useTransition();
	const [sendEmail, setSendEmail] = useState(false);

	function handleClose() {
		setSendEmail(false);
		onClose();
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		startTransition(async () => {
			const result = await markAsSentAction({
				invoiceId,
				sendEmail: sendEmail && Boolean(clientEmail),
			});

			if (result.error) {
				toast.error(result.error);
				return;
			}

			if (result.emailWarning) {
				toast.warning(result.emailWarning);
			} else {
				toast.success(
					result.emailedTo
						? `Invoice marked as sent and emailed to ${result.emailedTo}`
						: 'Invoice marked as sent'
				);
			}

			onSuccess();
			handleClose();
		});
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Mark Invoice as Sent</DialogTitle>
					<DialogDescription>
						Record this invoice as sent. Email delivery is optional.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-4'>
					{clientEmail && (
						<div className='flex items-start gap-2'>
							<Checkbox
								id='send-invoice-email'
								checked={sendEmail}
								onCheckedChange={(value) => setSendEmail(value === true)}
								className='mt-0.5'
							/>
							<div className='flex-1'>
								<Label
									htmlFor='send-invoice-email'
									className='cursor-pointer text-sm font-normal'
								>
									Email invoice to {clientEmail}
								</Label>
								<p className='text-xs text-muted-foreground'>
									Sends the invoice PDF using the configured email service.
								</p>
							</div>
						</div>
					)}

					<div className='flex gap-3'>
						<Button
							type='button'
							variant='outline'
							onClick={handleClose}
							className='flex-1'
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type='submit' className='flex-1' disabled={isPending}>
							{isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
							Mark as Sent
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 3: Make paid receipt delivery explicitly opt-in and resettable**

In `MarkAsPaidDialog.tsx`, change the initial state to:

```ts
	const [sendEmail, setSendEmail] = useState(false);
```

Add `DialogDescription` to the dialog imports, then replace the header with:

```tsx
				<DialogHeader>
					<DialogTitle>Mark Invoice as Paid</DialogTitle>
					<DialogDescription>
						Record the payment date. Sending a receipt is optional.
					</DialogDescription>
				</DialogHeader>
```

Add this function above `handleSubmit`:

```ts
	function handleClose() {
		setSendEmail(false);
		onClose();
	}
```

Replace the success branch inside `handleSubmit` with:

```ts
			if (result?.error) {
				toast.error(result.error);
				return;
			}

			if (result.emailWarning) {
				toast.warning(result.emailWarning);
			} else {
				toast.success(
					result.emailedTo
						? `Invoice marked as paid — receipt sent to ${result.emailedTo}`
						: 'Invoice marked as paid'
				);
			}

			onSuccess();
			handleClose();
```

Change the dialog and cancel handlers to:

```tsx
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
```

```tsx
						<Button
							type='button'
							variant='outline'
							onClick={handleClose}
							className='flex-1'
							disabled={isPending}
						>
```

- [ ] **Step 4: Wire the sent dialog into the invoice detail page**

Add the component import:

```ts
import { MarkAsSentDialog } from './MarkAsSentDialog';
```

Remove `markAsSentAction` from the controller import. Add sent dialog state beside the paid state:

```ts
	const [sentDialogOpen, setSentDialogOpen] = useState(false);
	const [paidDialogOpen, setPaidDialogOpen] = useState(false);
```

Delete the complete `handleMarkAsSent` function. Replace the draft primary button with:

```tsx
							<Button
								onClick={() => setSentDialogOpen(true)}
								disabled={isPending}
							>
								<Send className='mr-2 h-4 w-4' />
								Mark as Sent
							</Button>
```

Render the sent dialog immediately before `MarkAsPaidDialog`:

```tsx
			<MarkAsSentDialog
				invoiceId={invoice.id}
				clientEmail={invoice.clientEmail}
				open={sentDialogOpen}
				onSuccess={() => router.refresh()}
				onClose={() => setSentDialogOpen(false)}
			/>
```

- [ ] **Step 5: Run focused tests, lint the touched UI, and build**

Run:

```bash
docker compose exec app npm test -- server/modules/invoice/invoice.controller.test.ts server/modules/invoice/invoice.service.test.ts server/modules/invoice/invoice.types.test.ts
docker compose exec app npm run lint -- components/modules/invoice/MarkAsSentDialog.tsx components/modules/invoice/MarkAsPaidDialog.tsx components/modules/invoice/InvoiceDetail.tsx server/modules/invoice
docker compose exec app npm run build
```

Expected: all 17 focused tests pass, ESLint exits zero, and the production build completes.

- [ ] **Step 6: Verify the dialog behavior in the local app**

Use a local draft invoice with a client email and verify:

1. **Mark as Sent** opens the dialog.
2. The email checkbox is initially unchecked.
3. Closing and reopening leaves it unchecked.
4. Submitting unchecked changes the invoice to `SENT` without invoking email.
5. **Mark as Paid** opens with its receipt checkbox unchecked.
6. Closing and reopening leaves the receipt checkbox unchecked.
7. Submitting unchecked changes the invoice to `PAID`.
8. A draft with no client email does not render the sent-email checkbox.
9. Tab order reaches checkbox, Cancel, and primary action; Escape closes the dialog.

- [ ] **Step 7: Commit the dialog workflow**

```bash
git add components/modules/invoice/MarkAsSentDialog.tsx components/modules/invoice/MarkAsPaidDialog.tsx components/modules/invoice/InvoiceDetail.tsx
git commit -m "feat(invoice): add optional email dialogs"
```

---

### Task 6: Full Verification and Direct-to-Main Delivery

**Files:**
- Verify all files listed in the File Map.
- Do not create a PR or release branch.

**Interfaces:**
- Consumes: all completed tasks.
- Produces: verified commits on `main`, pushed to `origin/main`.

- [ ] **Step 1: Run the full automated test suite**

```bash
docker compose exec app npm test
```

Expected: every Vitest test passes with zero failures.

- [ ] **Step 2: Run full lint**

```bash
docker compose exec app npm run lint
```

Expected: ESLint exits zero.

- [ ] **Step 3: Run a fresh production build**

```bash
docker compose exec app npm run build
```

Expected: Next.js completes a production build with exit code zero.

- [ ] **Step 4: Review scope and whitespace**

```bash
git diff --check
git status --short --branch
git diff 67665b2..HEAD --name-only
```

Expected: no whitespace errors; only the approved spec/plan, invoice types/tests/service/controller, and three invoice UI files appear relative to the approved-design commit. `package.json`, `package-lock.json`, `docker-compose.yml`, `.env.example`, `server/modules/email/email.service.ts`, and Prisma files must not appear.

- [ ] **Step 5: Invoke verification and code-review skills**

Use `superpowers:requesting-code-review` to review the completed diff against the approved spec. Resolve every valid finding, rerun the affected checks, then use `superpowers:verification-before-completion` and re-run Steps 1-4 before making any completion claim.

- [ ] **Step 6: Push the verified commits directly to main**

```bash
git push origin main
```

Expected: `origin/main` advances without force-push.

- [ ] **Step 7: Confirm final repository state**

```bash
git status --short --branch
git log -6 --oneline --decorate
```

Expected: the worktree is clean and local `main` matches `origin/main`.
