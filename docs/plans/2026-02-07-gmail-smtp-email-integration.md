# Gmail SMTP Email Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-02-07
**Roadmap Item:** #3 - Set up SMTP (Gmail App Password)
**Status:** Design approved

**Goal:** Set up transactional email infrastructure using Gmail SMTP via Nodemailer, enabling password reset emails (roadmap #10) and future automated reports (roadmap #4, #9). Replaces prior Resend approach which required a custom domain to send to external recipients.

**Architecture:** Nodemailer with Gmail SMTP transport (`smtp.gmail.com:465`) using a Google App Password. Same `EmailService` class with `send()` and `sendPasswordReset()` methods following the existing module pattern. This also reverts all prior Resend work.

**Tech Stack:** Nodemailer, Gmail SMTP, Google App Password

---

## Prerequisites

Before executing this plan, the user needs:
1. **2FA enabled** on their Google account
2. **App Password generated** at https://myaccount.google.com/apppasswords (select app: "Mail" — Google generates a 16-character password)
3. Their Gmail address and the generated App Password ready to add to `.env`

---

### Task 1: Revert Resend — Uninstall package

**Files:**
- Modify: `package.json` (remove `resend` dependency)

**Step 1: Uninstall resend**

Run inside container:
```bash
docker compose exec app npm uninstall resend
```

**Step 2: Verify resend is gone from package.json**

Run:
```bash
grep resend package.json
```
Expected: No output

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove resend dependency"
```

---

### Task 2: Revert Resend — Delete test file and old design doc

**Files:**
- Delete: `test-email.ts`
- Delete: `docs/plans/2026-02-07-resend-email-integration-design.md`

**Step 1: Delete files**

```bash
rm test-email.ts
rm docs/plans/2026-02-07-resend-email-integration-design.md
```

**Step 2: Commit**

```bash
git add test-email.ts docs/plans/2026-02-07-resend-email-integration-design.md
git commit -m "chore: remove resend test file and design doc"
```

---

### Task 3: Install Nodemailer

**Files:**
- Modify: `package.json` (add `nodemailer` + `@types/nodemailer`)

Nodemailer exists as a transitive dep from next-auth but we need it as a direct dependency.

**Step 1: Install**

Run inside container:
```bash
docker compose exec app npm install nodemailer @types/nodemailer
```

**Step 2: Verify**

Run:
```bash
grep nodemailer package.json
```
Expected: `"nodemailer"` appears in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nodemailer as direct dependency"
```

---

### Task 4: Rewrite EmailService with Nodemailer

**Files:**
- Modify: `server/modules/email/email.service.ts` (full rewrite)

**Step 1: Rewrite the email service**

Replace entire file with:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

const EMAIL_FROM = process.env.SMTP_USER || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Email Service
 * Transactional email sending via Gmail SMTP
 */
export class EmailService {
	/**
	 * Send a generic email
	 */
	static async send({
		to,
		subject,
		html,
	}: {
		to: string;
		subject: string;
		html: string;
	}) {
		try {
			const info = await transporter.sendMail({
				from: EMAIL_FROM,
				to,
				subject,
				html,
			});
			return { id: info.messageId };
		} catch (error) {
			console.error('Failed to send email:', error);
			throw new Error(
				`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Send a password reset email
	 */
	static async sendPasswordReset({
		email,
		token,
		userName,
	}: {
		email: string;
		token: string;
		userName: string;
	}) {
		const resetUrl = `${APP_URL}/reset-password?token=${token}`;

		const html = `
			<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
				<h2>Password Reset</h2>
				<p>Hi ${userName},</p>
				<p>You requested a password reset for your Budget Planner account.</p>
				<p>
					<a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px;">
						Reset Password
					</a>
				</p>
				<p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
				<p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
			</div>
		`;

		return this.send({
			to: email,
			subject: 'Reset your password - Budget Planner',
			html,
		});
	}
}
```

**Step 2: Verify build**

Run inside container:
```bash
docker compose exec app npm run build
```
Expected: Build succeeds, no type errors

**Step 3: Commit**

```bash
git add server/modules/email/email.service.ts
git commit -m "feat: rewrite email service to use Gmail SMTP via Nodemailer"
```

---

### Task 5: Update environment variables

**Files:**
- Modify: `.env` (replace Resend vars with SMTP vars)
- Modify: `.env.example` (replace Resend vars with SMTP vars)

**Step 1: Update `.env.example`**

Replace the `# Resend Email` section with:

```env
# Email (Gmail SMTP)
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 2: Update `.env`**

Replace the `# Resend Email` section with actual credentials:

```env
# Email (Gmail SMTP)
SMTP_USER=<user's gmail>
SMTP_PASS=<user's app password>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note to executor:** Ask the user for their Gmail address and App Password.

**Step 3: Commit** (only .env.example — never commit .env)

```bash
git add .env.example
git commit -m "chore: update env example with Gmail SMTP vars"
```

---

### Task 6: Test email sending

**Files:**
- Create: `test-email.ts` (temporary, delete after)

**Step 1: Create test script**

```typescript
import { EmailService } from './server/modules/email/email.service';

async function main() {
	try {
		const result = await EmailService.send({
			to: '<ask user for target email>',
			subject: 'Budget Planner - Test Email',
			html: '<p>Gmail SMTP integration works!</p>',
		});
		console.log('Success:', result);
	} catch (error) {
		console.error('Failed:', error);
	}
}

main();
```

**Step 2: Run the test**

Run inside container:
```bash
docker compose exec app npx tsx test-email.ts
```
Expected: `Success: { id: '<message-id>' }` and email received in target inbox

**Step 3: Delete test file**

```bash
rm test-email.ts
```

**Step 4: Final build verification**

Run inside container:
```bash
docker compose exec app npm run build
```
Expected: Clean build, all routes intact

---

## Files Changed

| File | Change |
|------|--------|
| `server/modules/email/email.service.ts` | Rewrite — Nodemailer/Gmail SMTP |
| `.env.example` | Replace Resend vars with SMTP_USER, SMTP_PASS |
| `.env` | Replace Resend vars with actual Gmail credentials |
| `package.json` | Remove `resend`, add `nodemailer` + `@types/nodemailer` |
| `test-email.ts` | Temporary test script (deleted after verification) |

## Dependencies

- `nodemailer` npm package
- `@types/nodemailer` (TypeScript types)

## Notes

- This is foundation-only. No UI changes.
- Password reset (#10) and automated reports (#4, #9) will consume this service in subsequent releases.
- Gmail free tier: 500 emails/day — more than sufficient for a personal budget app.
- The `sendPasswordReset` template is preserved from the Resend version (same HTML).
