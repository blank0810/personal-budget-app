# Forgot Password + Google Auth

**Date:** 2026-02-07
**Roadmap Item:** #10 - Forgot password and Google auth
**Status:** Design approved
**Depends on:** #3 (Resend email integration)

## Goal

Add forgot password flow (via Resend email) and Google OAuth sign-in as an additional login option alongside existing email/password credentials.

## Approach

- **Auth provider:** NextAuth Google Provider (not Firebase). Zero new auth dependencies -- just add a provider to existing NextAuth v5 config.
- **Account linking:** Auto-link by email match. If a Google sign-in email matches an existing user, link them automatically. Safe because Google guarantees email verification.
- **Forgot password:** Token-based reset flow via email.

## 1. Forgot Password Flow

1. User clicks "Forgot password?" on login page
2. Enters email on `/forgot-password` page
3. Server generates a secure reset token, stores in DB with 1-hour expiry
4. Sends reset link via Resend: `{APP_URL}/reset-password?token=xxx`
5. User clicks link, lands on `/reset-password` page
6. Enters new password, server validates token, updates password hash, invalidates token

### Security

- Token: `crypto.randomUUID()` (cryptographically random)
- Expires after 1 hour
- One-time use (deleted after successful reset)
- Rate limiting: always show "If an account exists, we've sent a reset link" (don't reveal email existence)
- Old tokens for same email deleted when new one is generated

## 2. Google OAuth Integration

### NextAuth Config

Add Google provider alongside existing Credentials provider in `auth.ts`:

```typescript
providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Credentials({ ... })  // existing
]
```

### Auto-Link by Email Match

- Google sign-in → check if user exists with that email
- If yes → link Google provider to existing user via AuthAccount record, sign them in
- If no → create new User + AuthAccount record, sign them in
- Existing financial data stays intact in both cases

## 3. Database Changes

### New: PasswordResetToken model

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("password_reset_tokens")
}
```

### New: AuthAccount model

Named `AuthAccount` (mapped to `auth_accounts`) to avoid collision with existing financial `Account` model.

```prisma
model AuthAccount {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("auth_accounts")
}
```

### Modified: User model

Add relation to AuthAccount:

```prisma
model User {
  ...existing fields...
  authAccounts  AuthAccount[]
}
```

## 4. UI Changes

### Login page - modified

- Add "Forgot password?" link below password field
- Add "or continue with" divider
- Add "Sign in with Google" button below divider

### Register page - modified

- Add "or continue with" divider
- Add "Sign up with Google" button below divider

### New pages (under `app/(auth)/`)

- `/forgot-password` - Email input form, same auth layout as login/register
- `/reset-password` - New password + confirm password inputs, validates token from URL

### New components

- `components/auth/ForgotPasswordForm.tsx`
- `components/auth/ResetPasswordForm.tsx`

## 5. Files Changed

| File | Change |
|------|--------|
| `auth.ts` | Add Google provider + Prisma adapter config |
| `prisma/schema.prisma` | Add AuthAccount + PasswordResetToken models |
| `server/actions/auth.ts` | Add requestPasswordReset() + resetPassword() server actions |
| `server/modules/email/email.service.ts` | Add sendPasswordReset() template (service from #3) |
| `components/auth/LoginForm.tsx` | Add forgot password link + Google button |
| `components/auth/RegisterForm.tsx` | Add Google button |
| `app/(auth)/forgot-password/page.tsx` | New page |
| `app/(auth)/reset-password/page.tsx` | New page |
| `components/auth/ForgotPasswordForm.tsx` | New component |
| `components/auth/ResetPasswordForm.tsx` | New component |
| `.env.example` | Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| `middleware.ts` | Add /forgot-password, /reset-password to public routes |

## 6. Environment Variables

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

## 7. Google Cloud Console Setup (Manual)

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `{APP_URL}/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env`

## Dependencies

- `@auth/prisma-adapter` npm package (for NextAuth ↔ Prisma account linking)
- Resend email service (#3) must be implemented first
