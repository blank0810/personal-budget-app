# v2.2 Combined Changelog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden the public v2.2 changelog entry so it accurately presents both the Health Ledger redesign and optional invoice email delivery.

**Architecture:** Make one content-only change in `content/changelog/v2.2.md`. Preserve the existing version metadata and dashboard/report feature groups, broaden the release title and description, and insert one customer-facing invoice group before Reports. Validate the Markdown frontmatter through the same `gray-matter` parser used by `ChangelogService`, then run the complete tests and production build.

**Tech Stack:** Markdown, YAML frontmatter, gray-matter, Next.js 16, Vitest 4, Docker Compose

## Global Constraints

- Change only `content/changelog/v2.2.md` during implementation.
- Set the title exactly to **Clearer Financial Health, More Flexible Invoicing**.
- Keep `version: v2.2`, `date: 2026-08-16`, and `status: current` unchanged.
- Keep all four existing feature groups and their current items unchanged.
- Insert **Invoice Status Without Mandatory Email** immediately before **Reports Without Repetition**.
- Explain sent-without-email, paid-without-receipt, explicit unchecked email choices, and status preservation after delivery failure.
- Do not name Gmail, Nodemailer, Resend, or any email provider.
- Do not imply that a draft invoice can transition directly to paid.
- Do not change application behavior, dependencies, environment configuration, Prisma files, or migrations.
- Run project verification through Docker Compose.
- Work directly on `main`, commit, and push without a branch or PR.

## File Map

- Modify `content/changelog/v2.2.md`: combined release title, broader summary, and optional-email invoice feature group.
- Reference `docs/superpowers/specs/2026-08-17-v2-2-combined-changelog-design.md`: approved positioning and copy boundaries; do not modify during implementation.

---

### Task 1: Broaden the v2.2 Changelog Entry

**Files:**
- Modify: `content/changelog/v2.2.md:1-42`
- Reference: `docs/superpowers/specs/2026-08-17-v2-2-combined-changelog-design.md`

**Interfaces:**
- Consumes: the existing `gray-matter` frontmatter shape read by `ChangelogService.getAllVersions()`.
- Produces: one `Version` entry whose metadata remains `v2.2` / `2026-08-16` / `current`, whose title is broadened, and whose ordered `features` array contains five groups.

- [ ] **Step 1: Run a content assertion and verify the current entry is RED**

Run:

```bash
docker compose exec app node -e "const fs=require('fs'); const matter=require('gray-matter'); const {data}=matter(fs.readFileSync('content/changelog/v2.2.md','utf8')); if(data.title!=='Clearer Financial Health, More Flexible Invoicing') throw new Error('Unexpected v2.2 title'); if(!data.features.some((group)=>group.title==='Invoice Status Without Mandatory Email')) throw new Error('Missing invoice feature group');"
```

Expected: FAIL with `Unexpected v2.2 title` because the approved combined-release content has not been written yet.

- [ ] **Step 2: Update the title and release description**

In `content/changelog/v2.2.md`, keep `version`, `date`, and `status` unchanged. Replace the title and description with:

```yaml
title: Clearer Financial Health, More Flexible Invoicing
status: current
description: >
  See where your finances stand and keep invoice tracking true to what happened
  outside the app. The redesigned Health Ledger puts your score, verdict, five
  health pillars, supporting evidence, and most important next action into one
  direct view. Invoices can now be marked as sent or paid without sending an
  email, while invoice and receipt delivery remain available when you choose
  them. Reports stays focused on deeper analysis, and Transaction Statements
  now line up cleanly from opening balance to closing balance.
```

- [ ] **Step 3: Insert the invoice feature group before Reports**

Leave the existing dashboard, evidence, quick-action, and Reports groups unchanged. Insert this block immediately before `title: Reports Without Repetition`:

```yaml
  - title: Invoice Status Without Mandatory Email
    items:
      - "**Record what happened, even when it happened outside the app.** Mark a draft invoice as sent without emailing it, so hand-delivered or separately shared invoices still have the right status."
      - "**Email only when you choose to.** Invoice and paid-receipt delivery are optional and start unchecked each time; the choice appears when the client has an email address."
      - "**Payment tracking stays accurate.** Mark a sent or overdue invoice as paid with the payment date, with or without sending a receipt."
      - "**A delivery problem does not undo your work.** If a selected email cannot be sent, the new status stays saved and you can retry delivery from the invoice."
```

- [ ] **Step 4: Parse the finished content and verify all approved invariants are GREEN**

Run:

```bash
docker compose exec app node -e "const fs=require('fs'); const matter=require('gray-matter'); const {data}=matter(fs.readFileSync('content/changelog/v2.2.md','utf8')); const date=data.date instanceof Date?data.date.toISOString().slice(0,10):String(data.date); const titles=data.features.map((group)=>group.title); const expected=['A Dashboard That Gives You an Answer','Evidence, Not Decoration','Quick Actions, Kept Close','Invoice Status Without Mandatory Email','Reports Without Repetition']; if(data.version!=='v2.2'||date!=='2026-08-16'||data.status!=='current') throw new Error('Release metadata changed'); if(data.title!=='Clearer Financial Health, More Flexible Invoicing') throw new Error('Unexpected v2.2 title'); if(JSON.stringify(titles)!==JSON.stringify(expected)) throw new Error('Unexpected feature group order'); if(!data.description.includes('Invoices can now be marked as sent or paid without sending an email')) throw new Error('Description does not cover optional invoice email'); console.log(JSON.stringify({version:data.version,date,status:data.status,title:data.title,features:titles},null,2));"
```

Expected: PASS and print the unchanged metadata, the new title, and all five groups in the approved order.

- [ ] **Step 5: Run the complete automated test suite**

Run:

```bash
docker compose exec app npm test
```

Expected: PASS with all tests successful.

- [ ] **Step 6: Run the production build**

Run:

```bash
docker compose exec app npm run build
```

Expected: PASS, including static generation for `/changelog/v2.2`.

- [ ] **Step 7: Review the final diff and whitespace**

Run:

```bash
git diff --check
git diff -- content/changelog/v2.2.md
git status --short --branch
```

Expected: no whitespace errors; only `content/changelog/v2.2.md` is modified; the diff contains the approved title, description, and invoice group without provider names or internal implementation details.

- [ ] **Step 8: Commit the changelog update directly on main**

Run:

```bash
git add content/changelog/v2.2.md
git commit -m "docs(changelog): add flexible invoicing to v2.2"
```

Expected: one commit containing only the v2.2 changelog edit.

- [ ] **Step 9: Push main and confirm synchronization**

Run:

```bash
git push origin main
git status --short --branch
```

Expected: push succeeds and the final status is `main...origin/main` with no working-tree changes.
