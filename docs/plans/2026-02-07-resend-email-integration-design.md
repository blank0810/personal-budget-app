# Resend Email Integration

**Date:** 2026-02-07
**Roadmap Item:** #3 - Set up SMTP (using Resend instead of Google SMTP)
**Status:** Design approved

## Goal

Set up transactional email infrastructure using Resend, enabling password reset emails (roadmap #10) and future automated reports (roadmap #4, #9).

## Why Resend

- Free tier: 3,000 emails/month, 100/day (sufficient for personal budget app)
- First-class Next.js support, clean API
- No OAuth2 token refresh headaches (vs Gmail SMTP)
- Webhook configuration available for delivery tracking
- Easy upgrade path to custom domain later

## Architecture

### Email Service Module

New module at `server/modules/email/email.service.ts` following the existing module pattern:

```
server/modules/email/
  email.service.ts    # Resend SDK wrapper
```

### Service API

```typescript
EmailService.send({ to, subject, html })           // Generic send
EmailService.sendPasswordReset({ email, token, userName })  // Templated
```

### Environment Variables

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- Sender: `onboarding@resend.dev` (Resend shared domain, no custom domain needed)
- Upgradeable to custom domain by changing `EMAIL_FROM` + adding DNS records

## Email Templates

Inline HTML for now (no template engine). Only 1-2 email types in this release. Can adopt `react-email` later if template count grows.

## Files Changed

| File | Change |
|------|--------|
| `server/modules/email/email.service.ts` | New - Resend SDK wrapper |
| `.env.example` | Add RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL |
| `package.json` | Add `resend` dependency |

## Dependencies

- `resend` npm package

## Notes

- This is foundation-only. No UI changes.
- Password reset (#10) and automated reports (#4, #9) will consume this service in subsequent releases.
