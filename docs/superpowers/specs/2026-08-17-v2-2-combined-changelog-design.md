# v2.2 Combined Changelog Design

**Date:** 2026-08-17

**Status:** Approved

## Goal

Broaden the existing v2.2 changelog entry so it presents the Health Ledger redesign and the new optional invoice-email workflow as one customer-facing release.

## Release Positioning

The release title becomes **Clearer Financial Health, More Flexible Invoicing**. This keeps the financial-health work prominent while making invoicing a first-class part of v2.2 rather than an unmentioned maintenance patch.

The description will summarize both benefits:

- The dashboard now gives a direct financial diagnosis with evidence and a useful next action.
- Invoices can be recorded as sent or paid without forcing an email, while delivery remains available as an explicit choice.
- Reports and Transaction Statements remain the supporting improvements already documented in v2.2.

## Content Structure

Keep the four existing feature groups and their current customer-facing detail. Insert a new **Invoice Status Without Mandatory Email** group before **Reports Without Repetition**, producing this order:

1. A Dashboard That Gives You an Answer
2. Evidence, Not Decoration
3. Quick Actions, Kept Close
4. Invoice Status Without Mandatory Email
5. Reports Without Repetition

The invoice group will explain three user-visible behaviors:

1. A draft invoice can be marked as sent without sending it through the app; invoice email is an unchecked opt-in when a client email exists.
2. A sent or overdue invoice can be marked paid with its payment date while the paid receipt remains an unchecked opt-in.
3. If selected delivery fails, the recorded status remains saved and the existing delivery action can be retried.

## Copy Boundaries

- Write for app users, not maintainers.
- Describe outcomes rather than controller, Prisma, concurrency, or test implementation details.
- Do not name Gmail, Nodemailer, Resend, or any email provider. Provider migration is not a shipped user feature.
- Do not imply that draft invoices can be marked paid directly; the sequential sent-then-paid lifecycle remains intact.
- Do not change `version`, `date`, or `status` frontmatter.
- Do not change application behavior or any file outside `content/changelog/v2.2.md` during implementation.

## Validation

After editing, verify that the changelog parser can load v2.2, the rendered entry retains valid frontmatter and all five feature groups, and the production build succeeds. Review the final prose for accuracy against the implemented invoice behavior and for consistency with the tone of v2.1 and the existing v2.2 sections.
