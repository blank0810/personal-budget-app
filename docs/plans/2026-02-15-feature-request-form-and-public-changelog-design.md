# Feature Request Form & Public Changelog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow any visitor (authenticated or not) to submit feature requests via a form on a publicly accessible changelog page, with submissions stored in PostgreSQL and emailed to the admin.

**Architecture:** Move the changelog page from the authenticated layout to a standalone public route at `/changelog`. Add a `FeatureRequest` Prisma model with a `RequestCategory` enum. Build a feature request module (types → service → controller) following existing patterns. Embed the submission form at the bottom of the public changelog page. Rate-limit unauthenticated submissions via Redis (3/hour/IP). Send a styled HTML notification email to the admin on each submission.

**Tech Stack:** Next.js 15 App Router, Prisma 5, Redis (ioredis), Nodemailer, shadcn/ui, Zod

---

## Task 1: Schema — Add FeatureRequest model and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_feature_requests/migration.sql` (via `prisma migrate dev`)

**Step 1: Add the enum and model to the Prisma schema**

Add a `RequestCategory` enum after the existing `NotificationChannel` enum, a `FeatureRequest` model at the end of the file, and a `featureRequests` relation on the `User` model.

```prisma
// At the enum section (after NotificationChannel)
enum RequestCategory {
  BUG
  ENHANCEMENT
  NEW_FEATURE
  UI_UX
}

// At the end of the file
model FeatureRequest {
  id          String          @id @default(cuid())
  title       String
  description String
  category    RequestCategory
  email       String
  userId      String?
  ip          String?
  createdAt   DateTime        @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("feature_requests")
}
```

On the `User` model, add the relation field:
```prisma
featureRequests FeatureRequest[]
```

**Step 2: Create and apply the migration**

Run inside Docker:
```bash
docker exec budget-planner-app npx prisma migrate dev --name add_feature_requests
```

**Step 3: Regenerate the Prisma client**

```bash
docker exec budget-planner-app npx prisma generate
```

**Step 4: Verify build**

```bash
docker exec budget-planner-app npx next build
```

---

## Task 2: Feature request module — types, service, controller

**Files:**
- Create: `server/modules/feature-request/feature-request.types.ts`
- Create: `server/modules/feature-request/feature-request.service.ts`
- Create: `server/modules/feature-request/feature-request.controller.ts`

**Step 1: Create the types file with Zod schemas**

`server/modules/feature-request/feature-request.types.ts`:

```typescript
import { z } from 'zod';

export const submitRequestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  category: z.enum(['BUG', 'ENHANCEMENT', 'NEW_FEATURE', 'UI_UX']),
  email: z.string().email('Invalid email address'),
});

export type SubmitRequestInput = z.infer<typeof submitRequestSchema>;

export const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Bug Report',
  ENHANCEMENT: 'Enhancement',
  NEW_FEATURE: 'New Feature',
  UI_UX: 'UI/UX',
};
```

**Step 2: Create the service with rate limiting and email notification**

`server/modules/feature-request/feature-request.service.ts`:

```typescript
import prisma from '@/lib/prisma';
import { getRedisConnection } from '@/lib/redis';
import { RequestCategory } from '@prisma/client';
import { EmailService } from '@/server/modules/email/email.service';
import { CATEGORY_LABELS } from './feature-request.types';

const ADMIN_EMAIL = process.env.SMTP_USER || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

export const FeatureRequestService = {
  /**
   * Check if an IP has exceeded the rate limit (3 per hour)
   */
  async isRateLimited(ip: string): Promise<boolean> {
    const redis = getRedisConnection();
    const key = `feature-request:rate:${ip}`;
    const count = await redis.get(key);

    return count !== null && parseInt(count, 10) >= RATE_LIMIT_MAX;
  },

  /**
   * Increment the rate limit counter for an IP
   */
  async incrementRateLimit(ip: string): Promise<void> {
    const redis = getRedisConnection();
    const key = `feature-request:rate:${ip}`;
    const count = await redis.incr(key);

    // Set TTL only on first increment
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
  },

  /**
   * Create a feature request and send email notification
   */
  async create(data: {
    title: string;
    description: string;
    category: RequestCategory;
    email: string;
    userId?: string;
    ip?: string;
  }) {
    const request = await prisma.featureRequest.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        email: data.email,
        userId: data.userId ?? null,
        ip: data.ip ?? null,
      },
    });

    // Fire-and-forget email notification to admin
    this.notifyAdmin(request).catch((err) =>
      console.error('Failed to send feature request notification:', err)
    );

    // Increment rate limit counter (if IP available)
    if (data.ip) {
      this.incrementRateLimit(data.ip).catch(() => {});
    }

    return request;
  },

  /**
   * Send styled HTML email notification to admin
   */
  async notifyAdmin(request: {
    id: string;
    title: string;
    description: string;
    category: RequestCategory;
    email: string;
    userId: string | null;
    createdAt: Date;
  }) {
    if (!ADMIN_EMAIL) return;

    const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
    const submitterType = request.userId ? 'Registered User' : 'Public Visitor';
    const date = request.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const categoryColors: Record<string, string> = {
      BUG: '#DC2626',
      ENHANCEMENT: '#D97706',
      NEW_FEATURE: '#059669',
      UI_UX: '#7C3AED',
    };
    const color = categoryColors[request.category] || '#6B7280';

    const subject = `[Feature Request] ${categoryLabel}: ${request.title}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 32px 24px; border-bottom: 3px solid #0D9488;">
          <h1 style="margin: 0; font-size: 20px; color: #0D9488;">Budget Planner</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">New Feature Request</h2>
          <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${color}; margin-bottom: 20px;">
            ${categoryLabel}
          </div>
          <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top; width: 100px;">Title</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${request.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Category</td>
                <td style="padding: 8px 0; font-weight: 600; color: ${color};">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Submitted by</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${request.email} (${submitterType})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Date</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${date}</td>
              </tr>
            </table>
          </div>
          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
            <div style="padding: 16px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${request.description}</div>
          </div>
          <p style="margin: 0; font-size: 12px; color: #9CA3AF;">Request ID: ${request.id}</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF;">
          Sent from <a href="${APP_URL}/changelog" style="color: #0D9488;">Budget Planner</a> feature request form.
        </div>
      </div>
    `;

    await EmailService.send({ to: ADMIN_EMAIL, subject, html });
  },
};
```

**Step 3: Create the controller with server action**

`server/modules/feature-request/feature-request.controller.ts`:

```typescript
'use server';

import { auth } from '@/auth';
import { headers } from 'next/headers';
import { FeatureRequestService } from './feature-request.service';
import { submitRequestSchema } from './feature-request.types';

/**
 * Server Action: Submit a feature request (works for both authenticated and public users)
 */
export async function submitFeatureRequestAction(data: {
  title: string;
  description: string;
  category: string;
  email: string;
}) {
  const validated = submitRequestSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  // Get IP for rate limiting
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown';

  // Check rate limit
  const isLimited = await FeatureRequestService.isRateLimited(ip);
  if (isLimited) {
    return { error: 'Too many requests. Please try again later.' };
  }

  // Check if user is authenticated (optional)
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session?.user?.id;
  } catch {
    // Not authenticated — that's fine for public submissions
  }

  try {
    await FeatureRequestService.create({
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category as 'BUG' | 'ENHANCEMENT' | 'NEW_FEATURE' | 'UI_UX',
      email: validated.data.email,
      userId,
      ip,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to submit feature request:', error);
    return { error: 'Failed to submit request. Please try again.' };
  }
}
```

**Step 4: Verify build**

```bash
docker exec budget-planner-app npx next build
```

---

## Task 3: Move changelog to public route

**Files:**
- Create: `app/changelog/page.tsx` (new public route)
- Delete: `app/(authenticated)/changelog/page.tsx`
- Modify: `middleware.ts` (add `/changelog` to public routes)

**Step 1: Update middleware to allow `/changelog` publicly**

In `middleware.ts`, update the `isAuthPage` check to also include `/changelog`:

```typescript
const isPublicPage =
  req.nextUrl.pathname.startsWith('/login') ||
  req.nextUrl.pathname.startsWith('/register') ||
  req.nextUrl.pathname.startsWith('/forgot-password') ||
  req.nextUrl.pathname.startsWith('/reset-password') ||
  req.nextUrl.pathname.startsWith('/changelog');
```

Important: rename `isAuthPage` → `isPublicPage` throughout the middleware. Also, the redirect-to-dashboard logic should only apply to auth pages, not to `/changelog`:

```typescript
export default async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  const isPublicPage = isAuthPage || pathname.startsWith('/changelog');

  // Redirect authenticated users away from auth pages (not changelog)
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow public pages without auth
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}
```

**Step 2: Create the public changelog page**

Create `app/changelog/page.tsx` — a standalone page with a minimal header, the changelog timeline, and the feature request form embedded at the bottom. Use optional auth to detect logged-in users.

```tsx
import { auth } from '@/auth';
import { Rocket, Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangelogView } from '@/components/modules/changelog/ChangelogView';
import { ChangelogService } from '@/server/modules/changelog/changelog.service';
import { FeatureRequestForm } from '@/components/modules/feature-request/FeatureRequestForm';
import Link from 'next/link';

export default async function PublicChangelogPage() {
  const versions = ChangelogService.getAllVersions();

  // Optional auth — don't block page if not authenticated
  let userEmail: string | null = null;
  try {
    const session = await auth();
    userEmail = session?.user?.email ?? null;
  } catch {
    // Not authenticated
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Wallet className="size-4" />
            </div>
            <span className="font-semibold">Budget Planner</span>
          </Link>
          <div className="flex items-center gap-2">
            {userEmail ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to App
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Changelog content */}
      <main className="container py-6 md:py-10 space-y-12 max-w-4xl">
        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
              <Rocket className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Product Updates
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              A timeline of how the Budget Planner is evolving to help you build wealth.
            </p>
          </div>
          <ChangelogView versions={versions} />
        </div>

        {/* Feature Request Form */}
        <div id="request">
          <FeatureRequestForm userEmail={userEmail} />
        </div>
      </main>
    </div>
  );
}
```

**Step 3: Delete the old authenticated changelog page**

```bash
rm app/(authenticated)/changelog/page.tsx
```

Then remove the now-empty `app/(authenticated)/changelog/` directory:
```bash
rmdir app/(authenticated)/changelog
```

**Step 4: Verify build**

```bash
docker exec budget-planner-app npx next build
```

---

## Task 4: Feature request form component

**Files:**
- Create: `components/modules/feature-request/FeatureRequestForm.tsx`

**Step 1: Create the form component**

A client component with title, description, category dropdown, and conditional email field. Shows success state after submission. Uses `submitFeatureRequestAction` server action.

`components/modules/feature-request/FeatureRequestForm.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitFeatureRequestAction } from '@/server/modules/feature-request/feature-request.controller';

const CATEGORIES = [
  { value: 'BUG', label: 'Bug Report' },
  { value: 'ENHANCEMENT', label: 'Enhancement' },
  { value: 'NEW_FEATURE', label: 'New Feature' },
  { value: 'UI_UX', label: 'UI/UX' },
];

interface FeatureRequestFormProps {
  userEmail: string | null;
}

export function FeatureRequestForm({ userEmail }: FeatureRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitFeatureRequestAction({
        title,
        description,
        category,
        email,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setSubmitted(true);
        toast.success('Request submitted! Thank you for your feedback.');
      }
    });
  }

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    category !== '' &&
    email.trim().length > 0;

  if (submitted) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h3 className="text-lg font-semibold">Thank you!</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your feature request has been submitted. We review every submission
            and ship the best ideas into future updates.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setTitle('');
              setDescription('');
              setCategory('');
              if (!userEmail) setEmail('');
            }}
          >
            Submit Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquarePlus className="h-5 w-5" />
          Request a Feature
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Have an idea or found a bug? Let us know and we&apos;ll consider it for a future update.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-title">Title</Label>
            <Input
              id="request-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of your idea"
              disabled={isPending}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="request-category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isPending}>
              <SelectTrigger id="request-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-description">Description</Label>
          <Textarea
            id="request-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you'd like to see, how it should work, or what's broken..."
            disabled={isPending}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/1000
          </p>
        </div>
        {!userEmail && (
          <div className="space-y-2">
            <Label htmlFor="request-email">Your Email</Label>
            <Input
              id="request-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isPending}
            />
          </div>
        )}
        <Button
          onClick={handleSubmit}
          disabled={isPending || !canSubmit}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Submit Request
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify the Textarea component exists**

Check if `components/ui/textarea.tsx` exists. If not, install it:

```bash
docker exec budget-planner-app npx shadcn@latest add textarea --yes
```

**Step 3: Verify the Select component exists**

Check if `components/ui/select.tsx` exists. If not, install it:

```bash
docker exec budget-planner-app npx shadcn@latest add select --yes
```

**Step 4: Verify build**

```bash
docker exec budget-planner-app npx next build
```

---

## Task 5: Update changelog v1.8 entry and roadmap

**Files:**
- Modify: `content/changelog/v1.8.md` (add Feature Request Form + Public Changelog feature)
- Modify: `docs/plans/v1.8-roadmap.md` (mark #17 as completed)

**Step 1: Add feature entry to v1.8.md**

Add a new feature block to the `features` array in the YAML frontmatter:

```yaml
  - title: Feature Request Form & Public Changelog
    items:
      - "Public Changelog: Product updates accessible at /changelog without authentication."
      - "Feature Request Form: Embedded form with title, description, and category (Bug, Enhancement, New Feature, UI/UX)."
      - "Dual Access: Authenticated users auto-fill email; public visitors provide email manually."
      - "Email Notification: Styled HTML email sent to admin on each submission."
      - "Rate Limiting: Redis-based IP rate limit (3 submissions per hour) to prevent spam."
```

**Step 2: Update the roadmap**

Move #17 from Upcoming to Completed, update the progress counter.

**Step 3: Verify build**

```bash
docker exec budget-planner-app npx next build
```

---

## Batch Execution Strategy

| Batch | Tasks | Checkpoint |
|-------|-------|------------|
| 1 | Task 1 (schema) + Task 2 (module) | Verify build, Prisma client, service compiles |
| 2 | Task 3 (public route) + Task 4 (form component) | Verify build, test public access, test form submission |
| 3 | Task 5 (changelog + roadmap update) | Final build verify |

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `prisma/migrations/<timestamp>_add_feature_requests/migration.sql` |
| Create | `server/modules/feature-request/feature-request.types.ts` |
| Create | `server/modules/feature-request/feature-request.service.ts` |
| Create | `server/modules/feature-request/feature-request.controller.ts` |
| Create | `app/changelog/page.tsx` |
| Delete | `app/(authenticated)/changelog/page.tsx` |
| Modify | `middleware.ts` |
| Create | `components/modules/feature-request/FeatureRequestForm.tsx` |
| Modify | `content/changelog/v1.8.md` |
| Modify | `docs/plans/v1.8-roadmap.md` |
