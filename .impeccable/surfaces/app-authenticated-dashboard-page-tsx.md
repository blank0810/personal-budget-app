---
version: 1
slug: "app-authenticated-dashboard-page-tsx"
primary_target: "app/(authenticated)/dashboard/page.tsx"
related_targets: []
---

Mode: Operate. Scope is the authenticated dashboard route and its dashboard-only components; the application shell and Reports layout remain unchanged.

Audience and job: a signed-in person checking their money needs to understand financial health, the evidence behind it, and the single most useful next action within five seconds.

Content and proof: existing five-pillar health score; current-month net worth, income, expenses, and surplus; six-month cash flow; budget pressure; accounts/debt; unified recent activity. Aggressive verdict copy is shared with Reports and appears only when data is sufficient.

Chosen direction: Health Ledger. Approved comp: `.impeccable/mocks/decision/health-ledger.png`. The memorable moment is a full-width verdict followed by five fixed comparison rows connecting pillar, grade, evidence, and action.

Constraints: controller-only page data access; neutral authenticated-app tokens; semantic status color only; no carousel, AI teaser, dashboard tabs, count-up, score-ring, staggered entry, or looping motion; no historical score delta or date-range control; no database migration. Quick actions remain real and use existing mutation controllers. Empty means no non-tithe account and no YTD income/expense; partial means an account exists but both YTD values are zero; neither state receives a numeric or aggressive diagnosis.

Unresolved decisions: none.
