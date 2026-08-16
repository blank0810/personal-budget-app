# Optional Invoice Email and Resend Migration Design

**Date:** 2026-08-17

**Status:** Approved for implementation

## Goal

Decouple invoice status tracking from email delivery and replace the global Gmail SMTP transport with Resend. A user must be able to record an invoice as sent without emailing it, then mark that sent invoice as paid without emailing a receipt. Every outbound invoice or receipt email requires an explicit opt-in.

## Scope

This change covers two related areas:

1. The invoice transitions `DRAFT -> SENT -> PAID`, including their dialogs, server actions, service behavior, and delivery feedback.
2. The shared transactional email transport used by invoices, password resets, notifications, reports, and feature-request alerts.

The invoice lifecycle remains sequential. A `DRAFT` invoice cannot be marked `PAID` directly; the user first records it as `SENT`, with or without email. `OVERDUE` invoices remain eligible to be marked `PAID`. No database schema migration is required.

The production database cleanup, recovered invoice transfer, and demo seeder are outside this ticket.

## User Experience

### Mark as Sent

For a `DRAFT` invoice, the primary action is labeled **Mark as Sent**. It opens a confirmation dialog instead of immediately sending an email.

The dialog explains that this records the invoice as sent and that email delivery is optional. When the invoice has a client email, the dialog shows an **Email invoice to _address_** checkbox with supporting copy explaining that a PDF will be attached. The checkbox is unchecked each time the dialog opens. When no client email exists, the checkbox is not rendered.

Submitting always attempts the `DRAFT -> SENT` status transition. If email was not selected, the user sees **Invoice marked as sent**. If delivery succeeds, the success message also identifies the recipient. If delivery fails, the dialog closes, the refreshed invoice displays `SENT`, and a warning explains that the invoice was recorded as sent but the email was not delivered and may be retried.

### Mark as Paid

The existing paid dialog remains available only for `SENT` and `OVERDUE` invoices. Its **Email PAID receipt** checkbox is changed to unchecked by default and resets to unchecked each time the dialog opens.

Submitting always attempts the transition to `PAID` with the selected payment date. If receipt delivery fails, the status and payment date remain saved and the UI shows a warning that only the email failed. Existing **Resend Receipt** behavior remains available after the transition.

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
  -> optionally render PDF and send through EmailService
  -> return { emailedTo, emailWarning }
  -> invalidate invoice cache and refresh the page
```

`markAsSentAction` changes from a bare invoice ID argument to a validated object. `sendEmail` defaults to `false` in the Zod schema, so omitted or malformed callers cannot accidentally send an email.

### Paid transition

```text
MarkAsPaidDialog
  -> markAsPaidAction({ invoiceId, date, sendEmail })
  -> existing validation and authentication
  -> InvoiceService.markAsPaid(userId, input)
  -> validate current status is SENT or OVERDUE
  -> persist status PAID and paidAt
  -> optionally render receipt PDF and send through EmailService
  -> return { emailedTo, emailWarning }
  -> invalidate invoice-related caches and refresh the page
```

The misleading controller comment that says marking an invoice paid creates an income record will be corrected. This transition does not create income or modify account balances.

### Delivery result contract

Both transition methods return delivery metadata:

```ts
type InvoiceDeliveryResult = {
	emailedTo: string | null;
	emailWarning: string | null;
};
```

The exact provider error is logged on the server. The client receives stable, non-sensitive warning copy rather than Resend credentials, request details, or raw provider diagnostics.

## State and Failure Semantics

Business state and optional delivery are intentionally independent.

- The database transition runs before optional PDF rendering and email delivery.
- A database failure prevents email delivery and returns the normal action error.
- A PDF or Resend failure after a successful transition is caught by the invoice service. The service returns success for the transition plus `emailWarning`.
- Requesting email when the invoice has no client email also preserves the transition and returns a delivery warning. The UI prevents this path, while the service remains defensive for non-UI callers.
- `markAsPaid` continues rejecting `DRAFT`, `PAID`, and `CANCELLED` invoices.
- `markAsSent` continues rejecting any status other than `DRAFT`.

This ordering ensures an unreliable external email provider cannot roll back bookkeeping. It also prevents an email from being sent when the database transition itself fails.

## Resend Email Transport

The shared `EmailService` keeps its current public methods so existing callers do not need broad rewrites:

- `send`
- `sendWithAttachment`
- `sendInvoice`
- `sendInvoiceReceipt`
- `sendPasswordReset`

Internally, Nodemailer and Gmail SMTP are replaced with the official `resend` Node.js SDK. Every SDK response is checked for its returned `error`; SDK errors and thrown network errors are normalized into the existing `Failed to send email` service error contract.

The provider configuration is read from server-only environment variables:

```env
RESEND_API_KEY=re_xxx
EMAIL_FROM=Budget Planner <notifications@example.com>
ADMIN_EMAIL=admin@example.com
```

`EMAIL_FROM` must use a domain verified in Resend. It is the envelope and visible sender for all transactional mail. Invoice and receipt calls set the signed-in user's account email as the reply-to address when available, allowing the client to reply directly without attempting to send from an unverified per-user domain.

`ADMIN_EMAIL` replaces the current use of `SMTP_USER` as the feature-request notification recipient. No personal address is hardcoded into tracked files. Missing `RESEND_API_KEY` or `EMAIL_FROM` produces an actionable send-time configuration error.

Resend receives attachment buffers directly. The existing invoice/report PDF generation and email HTML remain otherwise unchanged.

## Configuration and Dependencies

- Add the current stable `resend` package.
- Remove `nodemailer` and `@types/nodemailer`.
- Replace `SMTP_USER` and `SMTP_PASS` with `RESEND_API_KEY`, `EMAIL_FROM`, and `ADMIN_EMAIL` in `docker-compose.yml` and `.env.example`.
- Keep all real values in deployment secrets or ignored environment files.
- Set the three production variables before deploying the transport change.

No compatibility fallback to Gmail SMTP will remain. A single provider avoids split configuration and ambiguous delivery behavior.

## Components and Files

- `components/modules/invoice/MarkAsSentDialog.tsx`: new confirmation dialog with explicit optional email selection.
- `components/modules/invoice/MarkAsPaidDialog.tsx`: default and reset receipt email selection to false; render transition-success/email-warning feedback.
- `components/modules/invoice/InvoiceDetail.tsx`: open the sent dialog, use a status-focused action label, and handle delivery result messages.
- `server/modules/invoice/invoice.types.ts`: add the sent input schema and make email defaults explicit.
- `server/modules/invoice/invoice.controller.ts`: validate the new sent input and expose non-sensitive delivery warnings.
- `server/modules/invoice/invoice.service.ts`: persist transitions before best-effort optional delivery and preserve strict lifecycle guards.
- `server/modules/email/email.service.ts`: implement the Resend transport while retaining the service API.
- `server/modules/feature-request/feature-request.service.ts`: use `ADMIN_EMAIL` for the notification recipient.
- `docker-compose.yml`, `.env.example`, `package.json`, and `package-lock.json`: update configuration and dependencies.

## Testing

Automated tests will protect the behavior at service boundaries:

1. A draft invoice becomes `SENT` without invoking email when `sendEmail` is false or omitted.
2. A selected sent email is attempted only after the status update.
3. A sent-email failure returns a warning while leaving the invoice `SENT`.
4. A sent or overdue invoice becomes `PAID` without sending a receipt by default.
5. A receipt failure returns a warning while leaving `PAID` and `paidAt` saved.
6. A draft invoice still cannot transition directly to `PAID`.
7. Resend receives the configured sender, recipient, reply-to address, HTML, and attachment content.
8. A Resend API error and a thrown transport error both become the service's stable email error.
9. Missing required Resend configuration fails at send time with an actionable error.

The implementation will follow a red-green cycle for each service behavior. Final verification runs the targeted tests first, then the complete Vitest suite, ESLint, and a production Next.js build through Docker Compose. The dialogs will also be checked for keyboard-accessible labels, disabled pending states, reset behavior, and correct success/warning copy.

## Deployment and Acceptance

Before deployment, production must have a Resend API key, a sender on a verified domain, and an admin notification recipient configured. Deployment must not run the demo database seeder.

The ticket is accepted when:

- A user can mark a draft invoice `SENT` without sending email.
- Neither invoice nor receipt email is selected by default.
- A user can subsequently mark that sent invoice `PAID` without email.
- Selecting email sends through Resend with the correct PDF and reply-to address.
- A delivery failure leaves the requested status saved and produces a clear warning.
- Existing password-reset, notification, report, and feature-request email callers use Resend through the shared service.
- Gmail SMTP variables and Nodemailer dependencies are absent from active application configuration.
