# Dashboard Health Ledger Redesign

**Date:** 2026-08-16

**Status:** Approved design; implementation pending

**Mode:** Operate

**Primary target:** `app/(authenticated)/dashboard/page.tsx`

**Approved comp:** `.impeccable/mocks/decision/health-ledger.png`

## 1. Purpose

The dashboard must tell a signed-in user the state of their finances within five seconds. It should answer three questions in order:

1. How healthy are my finances?
2. What evidence produced that judgment?
3. What should I do next?

The current dashboard distributes those answers across an account carousel, tabs, animated counters, a transfer form, a coming-soon AI teaser, and a small chart. The redesign replaces that widget collection with one coherent diagnosis: the **Health Ledger**.

This is a redesign of the dashboard route, not a redesign of the authenticated application shell or the Reports product area.

## 2. Approved direction

Health Ledger presents the overall score and blunt verdict first, then aligns all five health pillars into comparable rows. Each row connects the pillar question, grade, evidence, and next action. Supporting operational data follows in descending priority: cash flow, budget pressure, accounts and debt, then recent activity.

The approved comp is a spatial contract for hierarchy, topology, density, and visual character. It is not a source of production data and must not be rasterized into the application.

### Direction contract

> **THESIS:** The dashboard is one financial diagnosis, not a carousel of unrelated widgets. It refuses the category-default grid of equal cards competing for attention.
>
> **OWN-WORLD:** Neutral white or near-black surfaces, Geist typography, mono/tabular money, gray hairline dividers, restrained radii, and semantic green, amber, or red confined to status.
>
> **STORY:** The user sees the verdict, understands the five pieces of evidence behind it, and leaves with one concrete next action.
>
> **FIRST VIEWPORT:** A compact header with quick actions sits above a full-width verdict band; five fixed-column health rows dominate the page; cash-flow, budget, account, and activity evidence begins directly below.
>
> **FORM:** Health Ledger, dealt lead from structural candidate 3, concept seed `a706ea09`.
>
> **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 3. Scope

### Included

- Complete rewrite of the dashboard page composition.
- One consolidated, authenticated dashboard read action.
- Overall financial-health verdict using the existing five-pillar scoring model.
- Five-row Health Ledger with factual evidence and route-backed next actions.
- Current-month evidence strip and six-month cash-flow trend.
- Current-month budget pressure, accounts/debt summary, and recent unified activity.
- Existing quick-action sheets for income, expense, transfer, and debt payment.
- Empty, partial-data, loading, and error states.
- Responsive layouts, dark mode, keyboard access, and reduced-motion behavior.
- Focused removal of dashboard components made obsolete by the new composition.

### Excluded

- Changes to the financial-health scoring thresholds or pillar weights.
- A historical health-score system or a “points since last month” comparison.
- A dashboard date-range filter; the dashboard remains a current snapshot while Reports owns arbitrary ranges.
- Changes to Reports layout or functionality beyond sharing copy constants.
- AI Advisor functionality or a new AI teaser.
- Database schema changes or migrations.
- Changes to the authenticated sidebar or global application navigation.
- New invoicing or goals widgets on the dashboard. Those features remain available in their dedicated routes.

## 4. Information architecture

### 4.1 Header and quick actions

The page opens with “Dashboard” and a quiet `Current snapshot · <Month Year>` label. It does not retain the welcome-back subtitle or a decorative greeting because the financial state is the page’s subject.

Four existing actions remain visible on desktop: **Add income**, **Add expense**, **Transfer**, and **Pay debt**. They open the existing `QuickActionSheet` flows and continue to submit through their existing feature controllers. On narrow screens they form a compact two-by-two action group beneath the title.

The generated comp’s “This month” dropdown is not literalized. The existing health model is not period-aware, so an interactive control would imply behavior the product does not have.

### 4.2 Verdict band

The verdict band contains:

- Overall score out of 100.
- Existing overall label: Excellent, Good, Fair, Needs Attention, or Critical.
- The exact aggressive description already used by Reports for that label.
- The weakest valid pillar and its existing recommendation.
- One route-backed primary action for that pillar.

The dashboard must not invent a score delta. The mock’s “Down 4 points” line is omitted until the product stores or can faithfully reconstruct historical health scores.

If all pillars are grade A, the band links to Reports instead of manufacturing a problem. If multiple pillars share the lowest score, choose the higher-weight pillar; retain the existing pillar order as the final tie-breaker.

### 4.3 Five-pillar Health Ledger

The ledger order and weights remain:

1. Solvency — 25% — “Can you cover what you owe?”
2. Liquidity — 20% — “Can you survive an emergency?”
3. Savings — 20% — “Are you keeping enough of what you earn?”
4. Debt Management — 20% — “Is your debt under control?”
5. Cash Flow — 15% — “Is more coming in than going out?”

Desktop rows use aligned columns for pillar/question, score/grade, evidence, and next action. Rows are separated by hairlines rather than rendered as five cards. Evidence uses concise values derived from real dashboard metrics:

- Solvency: debt-to-asset ratio or debt-free state.
- Liquidity: runway or emergency-fund coverage.
- Savings: YTD savings rate.
- Debt Management: credit utilization, payoff progress, or debt-free state.
- Cash Flow: current-month income, expenses, and surplus/deficit.

The full existing `details` and `recommendation` remain available in Reports; the dashboard does not add an in-row disclosure layer. Each next action points to a real route or opens a real quick action. No action amount is invented.

### 4.4 Current-month evidence strip

The strip shows four values using the signed-in user’s currency:

- Net worth.
- Current-month income.
- Current-month expenses.
- Current-month surplus or deficit.

This is one aligned strip, not four independently elevated KPI cards. Values use tabular figures and pair semantic color with explicit signs or labels.

### 4.5 Lower operating area

The lower area contains four evidence views:

- **Cash-flow trend:** six chronological months of income and expense with surplus represented without a third decorative chart. The chart includes a textual summary for assistive technology and for empty data.
- **Budget pressure:** total current-month utilization and the three highest-pressure budgets, sorted by percentage used. It links to Budgets. When no budgets exist, it becomes a direct “Create a budget” state.
- **Accounts and debt:** liquid assets, liabilities, net worth, and credit utilization when applicable. It links to Accounts; it does not recreate the account carousel.
- **Recent activity:** the latest unified income, expense, transfer, and payment entries. It links to Transactions and preserves explicit type labels in addition to color.

The layout may use bounded panels for these distinct evidence groups, but it must avoid nested cards and equal-card bento styling.

## 5. Tone and copy

The dashboard and Reports must share one source for:

- Overall-label descriptions.
- Pillar one-line questions.
- Pillar names and ordering.

The existing Reports wording is authoritative, including its aggressive phrasing. The dashboard does not rewrite it into softer coaching copy. Aggression applies only when real data supports a diagnosis; empty or incomplete data receives factual setup guidance.

The pillar-specific `details` and `recommendation` strings continue to come from `DashboardService.getFinancialHealthScore()`. The dashboard adds only short, factual evidence labels and action labels required by the compact ledger.

## 6. Visual and interaction system

### Component grammar

- Continue using the authenticated app’s neutral OKLCH tokens and dark mode.
- Use Geist for interface text and Geist Mono/tabular figures for money.
- Use gray hairlines and spacing to group information before adding surfaces.
- Use the existing radius scale, but avoid a rounded container around every row.
- Reserve green, amber, orange, and red for status, trends, and progress only.
- Use small Lucide icons as redundant cues, never as decorative tiles.
- Keep the primary action near-black in light mode and near-white in dark mode.
- Preserve the existing application sidebar supplied by the authenticated layout; the dashboard must not render another one.

### Motion

- Remove staggered `animate-fade-up` entry animations.
- Remove animated number counting and animated score-ring drawing.
- Do not auto-scroll, loop, pulse, or celebrate.
- Retain only immediate control feedback and chart tooltip transitions.
- Honor `prefers-reduced-motion` for every remaining transition.

### Responsive behavior

- **Large desktop:** verdict band and five-column ledger span the content width; the lower area follows the approved comp’s broad chart plus supporting panels.
- **Laptop/tablet:** evidence and action columns tighten; lower panels reflow into two columns without horizontal page scrolling.
- **Mobile:** each ledger row becomes a compact vertical section in the same order—pillar/question, score/grade, evidence, action. Quick actions become two columns. Lower panels stack in priority order: cash flow, budget pressure, accounts/debt, recent activity.
- No essential value, label, or action may depend on hover.

## 7. Comp interpretation and implementation media

| Comp ingredient | Commitment | Implementation medium |
| --- | --- | --- |
| Existing app shell | Preserve real authenticated sidebar and content frame | Existing layout/components |
| Header quick actions | Four visible, labeled actions at desktop scale | Existing shadcn buttons and `QuickActionSheet` |
| Verdict band | Score, status, aggressive description, weakest recommendation, one action | Semantic React/HTML and CSS tokens |
| Five ledger rows | Fixed comparison rhythm with hairline separators | Semantic list/grid; no raster UI |
| Pillar/status marks | Small, redundant status cues | `lucide-react` plus text/grade |
| Money and ratios | Stable aligned figures | Geist Mono/tabular CSS |
| Cash-flow trend | Six-month readable trend | Recharts with accessible text summary |
| Budget progress | Total plus three highest-pressure budgets | Native/semantic progress treatment and CSS |
| Accounts/debt summary | Liquid assets, liabilities, net worth, utilization | Semantic rows and links |
| Recent activity | Four transaction types, compact and scannable | Semantic list/table and existing transaction data |

No new raster asset ships in the dashboard. The approved comp remains a review reference only.

### Comp details that must not be literalized

- Synthetic peso values, institution names, merchants, dates, and account names.
- The mock’s unsupported health-score delta.
- The mock’s dropdown-shaped current-period control.
- Example action amounts such as a fixed debt-payment figure.
- The mock’s sidebar markup, because the real layout already owns navigation.
- Desktop column widths on smaller devices.

## 8. Architecture and data flow

The page must follow the repository’s controller boundary. It must not call `DashboardService`, `BudgetService`, `CategoryService`, `GoalService`, `UserService`, or `TransactionService` directly.

```text
DashboardPage
  → getDashboardOverviewAction()
    → getAuthenticatedUser()
    → services queried in parallel
    → pure dashboard view-model builder
    → serializable DashboardOverview DTO
  → server-rendered dashboard sections
  → small client islands for quick-action sheets and chart interaction
```

### Controller

Create `server/modules/dashboard/dashboard.controller.ts` with a consolidated read action. The controller:

- Authenticates through `getAuthenticatedUser()`.
- Calls the required services in parallel.
- Catches and logs failures without exposing internal details.
- Returns `{ success: true, data }` or `{ error }`.
- Produces only serializable values; Prisma Decimal and Date values are converted at the boundary.

### View model

Extend dashboard types with a `DashboardOverview` DTO containing:

- Snapshot label and currency.
- Quick-action account/category/budget options.
- Overall health verdict and ordered pillar rows.
- Evidence-strip values.
- Six-month cash-flow points.
- Budget pressure summary and top three budgets.
- Accounts/debt summary.
- Recent unified activity.
- Data-quality state: `empty`, `partial`, or `complete`.

A pure builder maps service results to this DTO. Copy selection, weakest-pillar selection, tie-breaking, evidence labels, and action destinations live in this testable mapping layer rather than inside JSX.

### Query behavior

- Fetch `DashboardService.getDashboardData()` once per dashboard request.
- Fetch health score, trend, budgets, recent unified activity, user currency, and quick-action categories concurrently where dependencies allow.
- Do not retain the current duplicate `getDashboardData()` calls.
- Continue using existing mutation controllers and dashboard cache invalidation after quick actions.
- No migration is required.

## 9. Components and file boundaries

The implementation uses these component boundaries:

- `DashboardHeader` — title, snapshot label, quick-action triggers.
- `FinancialHealthVerdict` — overall score, shared Reports description, weakest recommendation, primary action.
- `HealthLedger` — ordered pillar comparison and responsive row behavior.
- `DashboardEvidenceStrip` — net worth, income, expenses, surplus/deficit.
- `CashFlowTrend` — chart and accessible summary.
- `BudgetPressure` — aggregate and highest-pressure budgets.
- `AccountsDebtSummary` — liquid assets, liabilities, net worth, utilization.
- `RecentActivity` — unified recent entries.
- `DashboardEmptyState` — onboarding and partial-data guidance.
- `DashboardSkeleton` — static geometry matching the new page.

Keep `QuickActionSheet.tsx` and its existing mutation-controller integrations. After the page no longer references them, delete obsolete dashboard-only components rather than leaving a second dashboard system in the repository. Candidate removals include the carousel, account card, tabs, transfer/payment panel, AI teaser, animated number, greeting header, and replaced trend/recent-transaction components; confirm each has no remaining import before deletion.

## 10. States and error handling

The controller classifies data quality with explicit rules:

- `empty`: no non-tithe account and no YTD income or expense.
- `partial`: at least one non-tithe account exists, but both YTD income and YTD expense are zero.
- `complete`: at least one non-tithe account exists and either YTD income or YTD expense is greater than zero.

Transfers, payments, budgets, or goals alone do not make the health verdict complete because the savings and cash-flow pillars still lack their required income/expense baseline.

### Empty

When the user has no accounts and no recorded activity:

- Do not show a numeric score or a critical verdict.
- Explain that the dashboard needs an account and transactions before it can judge financial health.
- Offer **Add account** as the primary action. Income and expense quick actions unlock after an account exists.
- Keep the visual hierarchy calm and factual.

### Partial data

When balances exist but health inputs are incomplete:

- Show valid pillar evidence.
- Mark unsupported pillars as `Needs data` instead of assigning a misleading failure.
- Withhold the numeric overall score and aggressive verdict while both YTD income and YTD expense are zero.
- Offer **Add income** and **Add expense** as the missing setup actions.

### Complete data

Show the full verdict, ordered ledger, evidence, and actions. Negative states use the established Reports tone without additional invented copy.

### Section-specific absence

- No budgets: creation prompt instead of zero-percent theater.
- No credit accounts: omit utilization and state `No credit accounts` where context is useful.
- No recent activity: explain what will appear after the first transaction.
- No chart activity: retain axes only if useful; otherwise show a compact explanation and action.

### Failure

The controller returns a safe error result. The page renders a focused retry state rather than partially combining stale and missing sections. Mutation failures continue to use each quick-action form’s existing inline/toast behavior.

## 11. Accessibility and performance

- Maintain heading order and landmarks.
- Make every action keyboard reachable with a visible focus state.
- Pair status color with labels, scores, grades, signs, or icons.
- Give the chart an accessible name and a text summary of the same values.
- Ensure compact evidence can expand or link without relying on hover.
- Use server components for static dashboard sections; keep client boundaries limited to actions and interactive chart behavior.
- Avoid sequential service waterfalls and duplicate queries.
- Preserve dark-mode contrast and support 200% zoom without loss of actions or data.

## 12. Testing and verification

### Automated tests

- Pure view-model tests for weakest-pillar selection, weighted tie-breaking, evidence labels, action destinations, and DTO serialization.
- Data-quality tests for empty, partial, and complete states.
- Copy tests proving Dashboard and Reports consume the same overall descriptions and pillar questions.
- Service/controller tests for successful aggregation and safe errors where existing test patterns support them.
- Regression test ensuring recent activity includes all supported unified transaction types.

### Docker verification

Run all project commands through the application container:

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
```

### Visual verification

Compare the implementation with the approved comp at its 1536×1024 frame, then inspect at approximately 1024px and 390px widths in both light and dark themes. Verify:

- The verdict and five pillars dominate the first scan.
- No horizontal overflow occurs.
- Quick actions remain visible and operable.
- Empty and partial states do not issue false negative judgments.
- No entry, counter, ring, carousel, or looping animation remains.
- The real application shell appears only once.

## 13. Acceptance criteria

The redesign is complete when:

1. A populated dashboard communicates overall health, weakest pillar, evidence, and a next action without opening another tab or carousel.
2. All five pillars are visible in a fixed comparison order.
3. Dashboard tone comes from the same shared copy source as Reports.
4. The account carousel, AI teaser, dashboard tabs, animated counters, and decorative entry animations are absent.
5. Quick income, expense, transfer, and payment flows still work through existing controllers.
6. Empty and partial users never receive a fabricated or misleading health diagnosis.
7. The page calls only the dashboard controller for its read model.
8. The implementation is responsive, keyboard accessible, dark-mode compatible, and verified through Docker.
9. The rendered first viewport is reviewed side-by-side with `.impeccable/mocks/decision/health-ledger.png`.
10. Obsolete dashboard-only components are removed only after import checks prove they are unused.
