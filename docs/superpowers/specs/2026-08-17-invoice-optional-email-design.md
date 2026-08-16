# Optional Invoice Email Design

**Date:** 2026-08-17

**Status:** Awaiting written-spec review

## Goal

Decouple invoice status tracking from email delivery. A user must be able to record an invoice as sent without emailing it, then mark that sent invoice as paid without emailing a receipt. Every outbound invoice or receipt email requires an explicit opt-in.

## Scope

This change covers the invoice transitions `DRAFT -> SENT -> PAID`, including their dialogs, server actions, service behavior, and delivery feedback.

The invoice lifecycle remains sequential. A `DRAFT` invoice cannot be marked `PAID` directly; the user first records it as `SENT`, with or without email. `OVERDUE` invoices remain eligible to be marked `PAID`. No database schema migration is required.

The existing Gmail/Nodemailer email transport remains unchanged. Migrating to Resend, changing shared email configuration, and modifying non-invoice email callers are explicitly deferred. The production database cleanup, recovered invoice transfer, and demo seeder are also outside this ticket.

## User Experience

### Mark as Sent

For a `DRAFT` invoice, the primary action is labeled **Mark as Sent**. It opens a confirmation dialog instead of immediately sending an email.

The dialog explains that this records the invoice as sent and that email delivery is optional. When the invoice has a client email, the dialog shows an **Email invoice to _address_** checkbox with supporting copy explaining that a PDF will be attached. The checkbox is unchecked each time the dialog opens. When no client email exists, the checkbox is not rendered.

Submitting always attempts the `DRAFT -> SENT` status transition. If email was not selected, the user sees **Invoice marked as sent**. If delivery succeeds, the success message also identifies the recipient. If delivery fails, the dialog closes, the refreshed invoice displays `SENT`, and a warning explains that the invoice was recorded as sent but the email was not delivered and may be retried.

### Mark as Paid

The existing paid dialog remains available only for `SENT` and `OVERDUE` invoices. Its **Email PAID receipt** checkbox is changed to unchecked by default and resets to unchecked each time the dialog opens.

Submitting always attempts the transition to `PAID` with the selected payment date. If receipt delivery fails, the status and payment date remain saved and the UI shows a warning that only the email failed. Existing **Resend Receipt** behavior remains available after the transition; here, “resend” means retrying delivery through the existing email provider.

### Retry behavior

Existing **Resend Email** and **Resend Receipt** actions remain separate delivery-only operations. They never change invoice status. A retry failure is reported as an email error because there is no accompanying business-state transition to preserve.

## Architecture and Data Flow

All UI requests continue through the invoice controller before reaching the invoice service.

### Sent transition

```text
MarkAsSentDialog
  -> markAsSentAction({ invoiceId, sendEmail })
  -> markAsSentSchema validation and authentication
  -> InvoiceService.markAsSent(userId, input)
  -> validate current status is DRAFT
  -> persist status SENT
  -> optionally render PDF and send through existing EmailService
  -> return { emailedTo, emailWarning }
  -> invalidate invoice cache and refresh the page
```

`markAsSentAction` changes from a bare invoice ID argument to a validated object. `sendEmail` defaults to `false` in the Zod schema, so an omitted value cannot accidentally send an email and a non-boolean value is rejected.

### Paid transition

```text
MarkAsPaidDialog
  -> markAsPaidAction({ invoiceId, date, sendEmail })
  -> validation and authentication
  -> InvoiceService.markAsPaid(userId, input)
  -> validate current status is SENT or OVERDUE
  -> persist status PAID and paidAt
  -> optionally render receipt PDF and send through existing EmailService
  -> return { emailedTo, emailWarning }
  -> invalidate invoice cache and refresh the page
```

`sendEmail` also defaults to `false` in the paid schema. The misleading controller comment that says marking an invoice paid creates an income record will be corrected, along with the unnecessary income, account, and dashboard cache invalidations. This transition only updates the invoice.

### Delivery result contract

Both transition methods return delivery metadata:

```ts
type InvoiceDeliveryResult = {
	emailedTo: string | null;
	emailWarning: string | null;
};
```

The exact PDF or email error is logged on the server. The client receives stable warning copy rather than raw transport diagnostics.

## State and Failure Semantics

Business state and optional delivery are intentionally independent.

- The database transition runs before optional PDF rendering and email delivery.
- A database failure prevents email delivery and returns the normal action error.
- A PDF or email failure after a successful transition is caught by the invoice service. The service returns success for the transition plus `emailWarning`.
- Requesting email when the invoice has no client email also preserves the transition and returns a delivery warning. The UI prevents this path, while the service remains defensive for non-UI callers.
- `markAsPaid` continues rejecting `DRAFT`, `PAID`, and `CANCELLED` invoices.
- `markAsSent` continues rejecting any status other than `DRAFT`.

This ordering ensures an unreliable external email operation cannot roll back bookkeeping. It also prevents an email from being sent when the database transition itself fails.

## Components and Files

- `components/modules/invoice/MarkAsSentDialog.tsx`: new confirmation dialog with explicit optional email selection.
- `components/modules/invoice/MarkAsPaidDialog.tsx`: default and reset receipt email selection to false; render transition-success/email-warning feedback.
- `components/modules/invoice/InvoiceDetail.tsx`: open the sent dialog and use a status-focused action label.
- `server/modules/invoice/invoice.types.ts`: add the sent input schema and default both email flags to false.
- `server/modules/invoice/invoice.controller.ts`: validate the new sent input, expose non-sensitive delivery warnings, and invalidate only relevant caches.
- `server/modules/invoice/invoice.service.ts`: persist transitions before best-effort optional delivery and preserve strict lifecycle guards.
- `server/modules/invoice/invoice.service.test.ts`: protect transition, opt-in, failure, and lifecycle behavior.

No shared email-service, feature-request, dependency, lockfile, Docker, or environment configuration file changes are part of this implementation.

## Testing

Automated tests will protect behavior at the invoice service boundary:

1. A draft invoice becomes `SENT` without invoking email when `sendEmail` is false or omitted.
2. A selected sent email is attempted only after the status update.
3. A sent-email failure returns a warning while leaving the invoice `SENT`.
4. A sent or overdue invoice becomes `PAID` without sending a receipt by default.
5. A selected paid receipt is attempted only after the paid status and date are saved.
6. A receipt failure returns a warning while leaving `PAID` and `paidAt` saved.
7. A draft invoice still cannot transition directly to `PAID`.
8. A requested email with no client address preserves the transition and returns a warning.

The implementation will follow a red-green cycle for each service behavior. Final verification runs the targeted invoice tests first, then the complete Vitest suite, ESLint, and a production Next.js build through Docker Compose. The dialogs will also be checked for keyboard-accessible labels, disabled pending states, reset behavior, and correct success/warning copy.

## Acceptance Criteria

The ticket is accepted when:

- A user can mark a draft invoice `SENT` without sending email.
- The sent-email checkbox is unchecked every time its dialog opens.
- A user can subsequently mark that sent invoice `PAID` without email.
- The paid-receipt checkbox is unchecked every time its dialog opens.
- Selecting email still sends the existing invoice or receipt PDF through the current EmailService.
- A delivery failure leaves the requested status saved and produces a clear warning.
- Existing delivery-only retry actions continue to work.
- No Resend package, provider integration, or shared email configuration change is introduced.
