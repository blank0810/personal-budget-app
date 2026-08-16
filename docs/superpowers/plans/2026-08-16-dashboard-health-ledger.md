# Dashboard Health Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the animated widget dashboard with the approved Health Ledger: one immediate financial-health verdict, five comparable pillars, current evidence, real next actions, and concise operating detail.

**Architecture:** `DashboardPage` performs one read through `getDashboardOverviewAction()`. That authenticated controller queries the existing services concurrently, normalizes Prisma values, and sends a serializable source object through a pure presenter; the page then renders server-first dashboard sections with client islands only for quick-action sheets and the Recharts graph. Reports and Dashboard consume the same health-label descriptions, pillar questions, and pillar order from a client-safe shared module.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Prisma 5, date-fns 4, Recharts 3, Vitest 4, Docker Compose, Impeccable 4.1.1.

## Global Constraints

- Run every application, test, lint, build, Prisma, and npm command through `docker compose`. Do not run `npm`, `npx`, or Next.js directly on the host.
- Work directly on `main`. Do not create a branch or PR. Stage only task-owned files, commit each completed task, and push it to `origin/main` without force-pushing or rewriting published history.
- Preserve the existing user-owned `docker-compose.yml` modification and all unrelated untracked files. Never stage them incidentally.
- Do not add maintainer names, personal contact details, or personal-profile stand-ins. Use signed-in data or neutral generic copy only.
- Do not add dependencies, a migration, a date-range control, historical score delta, AI widget, invoice widget, goal widget, new global navigation, or any new raster asset.
- Preserve the existing five scoring thresholds and weights: Solvency 25%, Liquidity 20%, Savings 20%, Debt Management 20%, Cash Flow 15%.
- The page must call only `getDashboardOverviewAction()` for read data. It must not import a dashboard, budget, category, transaction, user, goal, or invoice service.
- Keep the existing income, expense, transfer, and payment mutation controllers inside `QuickActionSheet.tsx`.
- Data quality is exact: `empty` means no non-tithe account and no YTD income or expense; `partial` means a non-tithe account exists while both YTD values are zero; `complete` means a non-tithe account exists and either YTD value is greater than zero.
- `empty` and `partial` must not show a numeric overall score or aggressive overall verdict. In `partial`, Savings and Cash Flow use `Needs data` while account-backed pillars retain valid evidence.
- The existing Reports descriptions are authoritative and must remain byte-for-byte unchanged after extraction.
- The first scan must be verdict → five-pillar ledger → evidence. Use neutral surfaces, hairline separation, Geist, tabular money, and semantic status color only.
- Remove carousel behavior, dashboard tabs, the AI teaser, animated counters, animated score-ring drawing, staggered entry effects, pulsing content, looping motion, and duplicate app-shell UI.
- Keep all primary information and actions accessible without hover; preserve visible keyboard focus, dark-mode contrast, 200% zoom usability, and reduced-motion safety.
- Use the approved comp `.impeccable/mocks/decision/health-ledger.png` as the hierarchy and density reference. It is not production content and must never be embedded into the page.
- Read `docs/superpowers/specs/2026-08-16-dashboard-health-ledger-design.md` and `.impeccable/surfaces/app-authenticated-dashboard-page-tsx.md` before implementation. The approved design spec wins when this plan and an implementation detail appear ambiguous.

---

## File Map

### Create

- `lib/financial-health-copy.ts` — shared health names, weights, questions, descriptions, and stable ordering helpers.
- `lib/financial-health-copy.test.ts` — locks the Reports wording and shared order.
- `server/modules/dashboard/dashboard.presenter.ts` — pure source-to-DTO mapping, quality classification, focus selection, evidence copy, actions, and serialization boundary.
- `server/modules/dashboard/dashboard.presenter.test.ts` — covers empty/partial/complete, weighted ties, evidence, actions, budget order, and all unified activity types.
- `server/modules/dashboard/dashboard.controller.ts` — sole authenticated dashboard read action.
- `server/modules/dashboard/dashboard.controller.test.ts` — verifies concurrent service orchestration, normalization, and safe error results.
- `components/modules/dashboard/dashboard-styles.ts` — one semantic tone-to-class map shared by verdict and ledger.
- `components/modules/dashboard/DashboardActionButton.tsx` — route or quick-sheet action renderer.
- `components/modules/dashboard/DashboardHeader.tsx` — title, snapshot label, and four availability-aware quick actions.
- `components/modules/dashboard/DashboardStatePanels.tsx` — empty and retry states.
- `components/modules/dashboard/FinancialHealthVerdict.tsx` — complete verdict or factual partial-data band.
- `components/modules/dashboard/HealthLedger.tsx` — fixed-order, responsive five-pillar comparison.
- `components/modules/dashboard/DashboardEvidenceStrip.tsx` — four current-month values without KPI-card chrome.
- `components/modules/dashboard/CashFlowTrend.tsx` — accessible six-month Recharts view and no-activity state.
- `components/modules/dashboard/BudgetPressure.tsx` — total utilization, three highest-pressure budgets, and creation state.
- `components/modules/dashboard/AccountsDebtSummary.tsx` — liquid assets, liabilities, net worth, and optional credit utilization.
- `components/modules/dashboard/RecentActivity.tsx` — unified income, expense, transfer, and payment list.
- `app/(authenticated)/dashboard/loading.tsx` — route-specific static Health Ledger loading geometry.
- `.impeccable/design.json` — generated sidecar for the finished, implemented dashboard grammar.

### Modify

- `server/modules/dashboard/dashboard.types.ts:1-42` — add the public serializable DTO and action contracts.
- `components/modules/reports/FinancialHealthCheck.tsx:1-100,176,217-221,342,368-372` — consume the shared copy and ordering without changing Reports layout.
- `components/modules/dashboard/QuickActionSheet.tsx:82-103` — export its option interfaces for the dashboard DTO boundary.
- `components/modules/dashboard/DashboardSkeleton.tsx:1-263` — replace old widget skeletons with one static Health Ledger skeleton.
- `app/(authenticated)/dashboard/page.tsx:1-277` — replace direct services and old widgets with the controller-backed composition.
- `DESIGN.md` — merge the finished dashboard grammar after the final visual review; preserve the broader authenticated-app system.

### Delete after import proof

- `components/modules/dashboard/AccountCard.tsx`
- `components/modules/dashboard/AccountCardCarousel.tsx`
- `components/modules/dashboard/AiAdvisorTeaser.tsx`
- `components/modules/dashboard/AnimatedNumber.tsx`
- `components/modules/dashboard/DashboardTabs.tsx`
- `components/modules/dashboard/GreetingHeader.tsx`
- `components/modules/dashboard/IncomeExpenseTrend.tsx`
- `components/modules/dashboard/QuickTransferPayment.tsx`
- `components/modules/dashboard/RecentTransactions.tsx`

---

### Task 1: Establish the shared financial-health copy contract

**Files:**

- Create: `lib/financial-health-copy.ts`
- Create: `lib/financial-health-copy.test.ts`
- Modify: `components/modules/reports/FinancialHealthCheck.tsx:1-100,176,217-221,342,368-372`

**Interfaces:**

- Consumes: Existing `FinancialHealthCheck` data with `overallLabel: string` and `pillars: Array<{ name: string }>`.
- Produces: `HEALTH_PILLARS`, `HealthPillarName`, `HEALTH_LABEL_DESCRIPTIONS`, `getHealthLabelDescription(label: string): string`, `getPillarQuestion(name: string): string`, and `orderHealthPillars<T extends { name: string }>(pillars: readonly T[]): T[]`.

- [ ] **Step 1: Write the failing shared-copy tests**

Create `lib/financial-health-copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	HEALTH_LABEL_DESCRIPTIONS,
	HEALTH_PILLARS,
	getHealthLabelDescription,
	getPillarQuestion,
	orderHealthPillars,
} from './financial-health-copy';

describe('financial health copy contract', () => {
	it('keeps the five pillars in scoring order with exact weights', () => {
		expect(HEALTH_PILLARS).toEqual([
			{ name: 'Solvency', weight: 0.25, question: 'Can you cover what you owe?' },
			{ name: 'Liquidity', weight: 0.2, question: 'Can you survive an emergency?' },
			{ name: 'Savings', weight: 0.2, question: 'Are you keeping enough of what you earn?' },
			{ name: 'Debt Management', weight: 0.2, question: 'Is your debt under control?' },
			{ name: 'Cash Flow', weight: 0.15, question: 'Is more coming in than going out?' },
		]);
	});

	it('preserves the aggressive Reports descriptions exactly', () => {
		expect(HEALTH_LABEL_DESCRIPTIONS).toEqual({
			Excellent: 'Absolutely elite. Your finances are tighter than a NASA launch checklist. Banks wish they had your discipline.',
			Good: 'You\'re doing well — genuinely. Most people would kill for this position. A couple of tweaks and you\'re untouchable.',
			Fair: 'Not terrible, not great. You\'re the financial equivalent of a C+ student — passing, but nobody\'s putting you on the fridge.',
			'Needs Attention': 'Your finances are held together with duct tape and denial. This isn\'t a warning, it\'s an intervention.',
			Critical: 'Financially deceased. If your bank account was a patient, we\'d be calling time of death. Fix this or start a GoFundMe.',
		});
		expect(getHealthLabelDescription('unknown')).toBe('');
	});

	it('orders incoming service pillars and resolves their questions', () => {
		const ordered = orderHealthPillars([
			{ name: 'Cash Flow', score: 20 },
			{ name: 'Solvency', score: 80 },
			{ name: 'Savings', score: 60 },
			{ name: 'Liquidity', score: 40 },
			{ name: 'Debt Management', score: 100 },
		]);

		expect(ordered.map((pillar) => pillar.name)).toEqual(
			HEALTH_PILLARS.map((pillar) => pillar.name)
		);
		expect(getPillarQuestion('Liquidity')).toBe('Can you survive an emergency?');
		expect(getPillarQuestion('Unknown')).toBe('');
	});
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run:

```bash
docker compose exec app npm run test -- lib/financial-health-copy.test.ts
```

Expected: FAIL because `./financial-health-copy` does not exist.

- [ ] **Step 3: Implement the shared constants and helpers**

Create `lib/financial-health-copy.ts`:

```ts
export const HEALTH_PILLARS = [
	{ name: 'Solvency', weight: 0.25, question: 'Can you cover what you owe?' },
	{ name: 'Liquidity', weight: 0.2, question: 'Can you survive an emergency?' },
	{ name: 'Savings', weight: 0.2, question: 'Are you keeping enough of what you earn?' },
	{ name: 'Debt Management', weight: 0.2, question: 'Is your debt under control?' },
	{ name: 'Cash Flow', weight: 0.15, question: 'Is more coming in than going out?' },
] as const;

export type HealthPillarName = (typeof HEALTH_PILLARS)[number]['name'];

export const HEALTH_LABEL_DESCRIPTIONS = {
	Excellent: 'Absolutely elite. Your finances are tighter than a NASA launch checklist. Banks wish they had your discipline.',
	Good: 'You\'re doing well — genuinely. Most people would kill for this position. A couple of tweaks and you\'re untouchable.',
	Fair: 'Not terrible, not great. You\'re the financial equivalent of a C+ student — passing, but nobody\'s putting you on the fridge.',
	'Needs Attention': 'Your finances are held together with duct tape and denial. This isn\'t a warning, it\'s an intervention.',
	Critical: 'Financially deceased. If your bank account was a patient, we\'d be calling time of death. Fix this or start a GoFundMe.',
} as const;

const PILLAR_INDEX = new Map<string, number>(
	HEALTH_PILLARS.map((pillar, index) => [pillar.name, index])
);

export function getHealthLabelDescription(label: string): string {
	return HEALTH_LABEL_DESCRIPTIONS[
		label as keyof typeof HEALTH_LABEL_DESCRIPTIONS
	] ?? '';
}

export function getPillarQuestion(name: string): string {
	return HEALTH_PILLARS.find((pillar) => pillar.name === name)?.question ?? '';
}

export function orderHealthPillars<T extends { name: string }>(
	pillars: readonly T[]
): T[] {
	return [...pillars].sort(
		(a, b) =>
			(PILLAR_INDEX.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
			(PILLAR_INDEX.get(b.name) ?? Number.MAX_SAFE_INTEGER)
	);
}
```

- [ ] **Step 4: Replace Reports-local copies with shared imports**

In `components/modules/reports/FinancialHealthCheck.tsx`:

```tsx
import {
	getHealthLabelDescription,
	getPillarQuestion,
	orderHealthPillars,
} from '@/lib/financial-health-copy';
```

Delete the local `PILLAR_ONE_LINERS` object and `getLabelDescription` function. Replace both description calls with `getHealthLabelDescription(data.overallLabel)`. At both existing pillar render loops, call `orderHealthPillars(data.pillars)` before `map`, and replace each one-liner lookup with:

```tsx
const oneLiner = getPillarQuestion(pillar.name);
```

Do not alter `ScoreRing`, collapsible behavior, card markup, tone classes, or any Reports copy in this task.

- [ ] **Step 5: Run the focused test and lint the touched files**

Run:

```bash
docker compose exec app npm run test -- lib/financial-health-copy.test.ts
docker compose exec app npm run lint -- lib/financial-health-copy.ts lib/financial-health-copy.test.ts components/modules/reports/FinancialHealthCheck.tsx
```

Expected: one passing test file and zero ESLint errors.

- [ ] **Step 6: Commit and push Task 1**

```bash
git add lib/financial-health-copy.ts lib/financial-health-copy.test.ts components/modules/reports/FinancialHealthCheck.tsx
git commit -m "refactor: share financial health copy"
git push origin main
```

---

### Task 2: Build the serializable dashboard presenter test-first

**Files:**

- Modify: `server/modules/dashboard/dashboard.types.ts:1-42`
- Create: `server/modules/dashboard/dashboard.presenter.ts`
- Create: `server/modules/dashboard/dashboard.presenter.test.ts`

**Interfaces:**

- Consumes: `DashboardOverviewSource` with normalized numbers, ISO transaction dates, current budgets, health output, categories, and currency.
- Produces: `buildDashboardOverview(source: DashboardOverviewSource, now: Date): DashboardOverview` plus the public DTO/action types defined below.

- [ ] **Step 1: Add the dashboard DTO contracts**

Add the type-only import at the top of `server/modules/dashboard/dashboard.types.ts`. Keep every existing export, then append the new contracts:

```ts
import type { HealthPillarName } from '@/lib/financial-health-copy';

export type DashboardDataQuality = 'empty' | 'partial' | 'complete';
export type DashboardTone = 'positive' | 'warning' | 'negative' | 'neutral';
export type DashboardQuickActionKind =
	| 'income'
	| 'expense'
	| 'transfer'
	| 'payment';

export type DashboardAction =
	| {
			kind: 'quick-action';
			action: DashboardQuickActionKind;
			label: string;
	  }
	| {
			kind: 'link';
			href: '/accounts' | '/budgets' | '/goals' | '/reports' | '/transactions';
			label: string;
	  };

export interface DashboardPillarRow {
	name: HealthPillarName;
	question: string;
	weight: number;
	score: number | null;
	grade: string | null;
	status: 'supported' | 'needs-data';
	tone: DashboardTone;
	evidence: string;
	recommendation: string | null;
	action: DashboardAction;
}

export interface DashboardOverview {
	snapshotLabel: string;
	currency: string;
	dataQuality: DashboardDataQuality;
	quickActions: {
		accounts: Array<{
			id: string;
			name: string;
			type: string;
			balance: number;
			isLiability: boolean;
		}>;
		incomeCategories: Array<{ id: string; name: string }>;
		expenseCategories: Array<{ id: string; name: string }>;
		budgets: Array<{
			id: string;
			name: string;
			categoryId: string;
			categoryName: string;
		}>;
		availability: Record<
			DashboardQuickActionKind,
			{ enabled: boolean; disabledReason: string | null }
		>;
	};
	health: {
		verdict: {
			score: number;
			label: string;
			description: string;
			tone: DashboardTone;
			focus: {
				pillarName: HealthPillarName | null;
				grade: string | null;
				recommendation: string;
				action: DashboardAction;
			};
		} | null;
		pillars: DashboardPillarRow[];
	};
	evidence: {
		netWorth: number;
		income: number;
		expense: number;
		surplus: number;
	};
	cashFlow: {
		points: Array<{
			month: string;
			income: number;
			expense: number;
			surplus: number;
		}>;
		hasActivity: boolean;
		totalIncome: number;
		totalExpense: number;
		net: number;
	};
	budgetPressure: {
		hasBudgets: boolean;
		totalBudgeted: number;
		totalSpent: number;
		utilizationPercent: number | null;
		items: Array<{
			id: string;
			name: string;
			categoryName: string;
			amount: number;
			spent: number;
			percentage: number;
		}>;
	};
	accountsDebt: {
		liquidAssets: number;
		liabilities: number;
		netWorth: number;
		creditUtilization: number | null;
	};
	recentActivity: Array<{
		id: string;
		kind: 'income' | 'expense' | 'transfer' | 'payment';
		title: string;
		context: string;
		amount: number;
		direction: 'in' | 'out' | 'neutral';
		date: string;
	}>;
}
```

- [ ] **Step 2: Write failing presenter tests with literal source data**

Create `server/modules/dashboard/dashboard.presenter.test.ts` with a complete five-pillar fixture and these tests:

```ts
import { describe, expect, it } from 'vitest';
import { HEALTH_LABEL_DESCRIPTIONS } from '@/lib/financial-health-copy';
import {
	buildDashboardOverview,
	type DashboardOverviewSource,
} from './dashboard.presenter';

function makeSource(): DashboardOverviewSource {
	return {
		currency: 'PHP',
		dashboard: {
			accounts: [
				{
					id: 'asset-1',
					name: 'Main Bank',
					type: 'BANK',
					balance: 20000,
					isLiability: false,
					isArchived: false,
				},
				{
					id: 'debt-1',
					name: 'Credit Account',
					type: 'CREDIT',
					balance: 5000,
					isLiability: true,
					isArchived: false,
				},
			],
			netWorth: 15000,
			assets: 20000,
			liabilities: 5000,
			savingsRate: 20,
			runwayMonths: 2.5,
			creditUtilization: 25,
			totalCreditUsed: 5000,
			totalCreditLimit: 20000,
			totalDebt: 5000,
			debtPaydown: 1000,
			debtToAssetRatio: 25,
			liquidAssets: 20000,
			ytdIncome: 100000,
			ytdExpense: 80000,
			income: 20000,
			expense: 15000,
		},
		health: {
			overallScore: 68,
			overallLabel: 'Fair',
			pillars: [
				{ name: 'Cash Flow', score: 80, grade: 'B', weight: 0.15, details: 'Cash-flow detail.', recommendation: 'Keep the monthly gap positive.' },
				{ name: 'Debt Management', score: 60, grade: 'C', weight: 0.2, details: 'Debt detail.', recommendation: 'Pay more than the minimum.' },
				{ name: 'Savings', score: 80, grade: 'B', weight: 0.2, details: 'Savings detail.', recommendation: 'Keep saving consistently.' },
				{ name: 'Liquidity', score: 60, grade: 'C', weight: 0.2, details: 'Liquidity detail.', recommendation: 'Build three months of runway.' },
				{ name: 'Solvency', score: 60, grade: 'C', weight: 0.25, details: 'Solvency detail.', recommendation: 'Reduce the debt-to-asset ratio.' },
			],
		},
		trend: [
			{ month: 'Mar', income: 10000, expense: 9000 },
			{ month: 'Apr', income: 12000, expense: 10000 },
			{ month: 'May', income: 15000, expense: 11000 },
			{ month: 'Jun', income: 16000, expense: 14000 },
			{ month: 'Jul', income: 18000, expense: 16000 },
			{ month: 'Aug', income: 20000, expense: 15000 },
		],
		budgets: [
			{ id: 'b1', name: 'Food', categoryId: 'c1', categoryName: 'Food', amount: 10000, spent: 9500, percentage: 95 },
			{ id: 'b2', name: 'Housing', categoryId: 'c2', categoryName: 'Housing', amount: 15000, spent: 12000, percentage: 80 },
			{ id: 'b3', name: 'Transport', categoryId: 'c3', categoryName: 'Transportation', amount: 5000, spent: 5500, percentage: 110 },
			{ id: 'b4', name: 'Utilities', categoryId: 'c4', categoryName: 'Utilities', amount: 4000, spent: 2000, percentage: 50 },
		],
		incomeCategories: [{ id: 'income-cat', name: 'Salary' }],
		expenseCategories: [{ id: 'expense-cat', name: 'Food' }],
		transactions: [
			{ kind: 'income', id: 'i1', amount: 20000, date: '2026-08-15T00:00:00.000Z', description: 'Paycheck', accountName: 'Main Bank', categoryName: 'Salary' },
			{ kind: 'expense', id: 'e1', amount: 1200, date: '2026-08-14T00:00:00.000Z', description: 'Groceries', accountName: 'Main Bank', categoryName: 'Food', budgetName: 'Food' },
			{ kind: 'transfer', id: 't1', amount: 1000, date: '2026-08-13T00:00:00.000Z', description: null, fromAccountName: 'Main Bank', toAccountName: 'Savings', fee: 0, isPayment: false },
			{ kind: 'transfer', id: 'p1', amount: 500, date: '2026-08-12T00:00:00.000Z', description: null, fromAccountName: 'Main Bank', toAccountName: 'Credit Account', fee: 0, isPayment: true },
		],
	};
}

describe('buildDashboardOverview', () => {
	it('classifies empty, partial, and complete data without false verdicts', () => {
		const empty = makeSource();
		empty.dashboard.accounts = [
			{
				id: 'tithe-1',
				name: 'Tithe',
				type: 'TITHE',
				balance: 0,
				isLiability: false,
				isArchived: false,
			},
		];
		empty.dashboard.ytdIncome = 0;
		empty.dashboard.ytdExpense = 0;
		expect(buildDashboardOverview(empty, new Date(2026, 7, 16))).toMatchObject({
			dataQuality: 'empty',
			health: { verdict: null },
		});

		const partial = makeSource();
		partial.dashboard.ytdIncome = 0;
		partial.dashboard.ytdExpense = 0;
		const partialResult = buildDashboardOverview(partial, new Date(2026, 7, 16));
		expect(partialResult.dataQuality).toBe('partial');
		expect(partialResult.health.verdict).toBeNull();
		expect(
			partialResult.health.pillars
				.filter((pillar) => pillar.status === 'needs-data')
				.map((pillar) => pillar.name)
		).toEqual(['Savings', 'Cash Flow']);

		const complete = buildDashboardOverview(makeSource(), new Date(2026, 7, 16));
		expect(complete.dataQuality).toBe('complete');
		expect(complete.health.verdict?.description).toBe(
			HEALTH_LABEL_DESCRIPTIONS.Fair
		);
	});

	it('uses score, weight, then canonical order to choose the focus pillar', () => {
		const result = buildDashboardOverview(makeSource(), new Date(2026, 7, 16));
		expect(result.health.verdict?.focus).toMatchObject({
			pillarName: 'Solvency',
			grade: 'C',
			recommendation: 'Reduce the debt-to-asset ratio.',
			action: { kind: 'link', href: '/accounts', label: 'Review debt' },
		});
	});

	it('links all-A health to Reports instead of manufacturing a weakness', () => {
		const source = makeSource();
		source.health.pillars = source.health.pillars.map((pillar) => ({
			...pillar,
			score: 100,
			grade: 'A',
		}));
		source.health.overallScore = 100;
		source.health.overallLabel = 'Excellent';
		const result = buildDashboardOverview(source, new Date(2026, 7, 16));
		expect(result.health.verdict?.focus).toEqual({
			pillarName: null,
			grade: null,
			recommendation: 'All five pillars are graded A.',
			action: { kind: 'link', href: '/reports', label: 'Open full report' },
		});
	});

	it('builds factual evidence, action destinations, budget pressure, and all activity kinds', () => {
		const result = buildDashboardOverview(makeSource(), new Date(2026, 7, 16));
		expect(result.snapshotLabel).toBe('August 2026');
		expect(result.health.pillars.map((pillar) => pillar.name)).toEqual([
			'Solvency',
			'Liquidity',
			'Savings',
			'Debt Management',
			'Cash Flow',
		]);
		expect(result.health.pillars[0].evidence).toBe('25.0% debt-to-asset');
		expect(result.health.pillars[3].action).toEqual({
			kind: 'quick-action',
			action: 'payment',
			label: 'Pay down debt',
		});
		expect(result.budgetPressure.items.map((budget) => budget.id)).toEqual([
			'b3',
			'b1',
			'b2',
		]);
		expect(result.recentActivity.map((item) => item.kind)).toEqual([
			'income',
			'expense',
			'transfer',
			'payment',
		]);
	});

	it('returns only JSON-safe output and availability-aware quick actions', () => {
		const result = buildDashboardOverview(makeSource(), new Date(2026, 7, 16));
		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
		expect(result.quickActions.availability).toEqual({
			income: { enabled: true, disabledReason: null },
			expense: { enabled: true, disabledReason: null },
			transfer: { enabled: true, disabledReason: null },
			payment: { enabled: true, disabledReason: null },
		});
	});
});
```

- [ ] **Step 3: Run the presenter test and confirm the missing builder failure**

Run:

```bash
docker compose exec app npm run test -- server/modules/dashboard/dashboard.presenter.test.ts
```

Expected: FAIL because `dashboard.presenter.ts` does not exist.

- [ ] **Step 4: Add the normalized presenter source interfaces**

Create `server/modules/dashboard/dashboard.presenter.ts`. Use these exact source interfaces:

```ts
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import {
	HEALTH_PILLARS,
	getHealthLabelDescription,
	type HealthPillarName,
} from '@/lib/financial-health-copy';
import type {
	DashboardAction,
	DashboardDataQuality,
	DashboardOverview,
	DashboardPillarRow,
	DashboardTone,
} from './dashboard.types';

interface DashboardSourceAccount {
	id: string;
	name: string;
	type: string;
	balance: number;
	isLiability: boolean;
	isArchived: boolean;
}

interface DashboardSourceSummary {
	accounts: DashboardSourceAccount[];
	netWorth: number;
	assets: number;
	liabilities: number;
	savingsRate: number;
	runwayMonths: number | null;
	creditUtilization: number;
	totalCreditUsed: number;
	totalCreditLimit: number;
	totalDebt: number;
	debtPaydown: number;
	debtToAssetRatio: number;
	liquidAssets: number;
	ytdIncome: number;
	ytdExpense: number;
	income: number;
	expense: number;
}

interface DashboardSourcePillar {
	name: string;
	score: number;
	grade: string;
	weight: number;
	details: string;
	recommendation: string;
}

interface DashboardSourceBudget {
	id: string;
	name: string;
	categoryId: string;
	categoryName: string;
	amount: number;
	spent: number;
	percentage: number;
}

type DashboardSourceTransaction =
	| {
			kind: 'income';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
	  }
	| {
			kind: 'expense';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
			budgetName: string | null;
	  }
	| {
			kind: 'transfer';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			fromAccountName: string;
			toAccountName: string;
			fee: number;
			isPayment: boolean;
	  };

export interface DashboardOverviewSource {
	currency: string;
	dashboard: DashboardSourceSummary;
	health: {
		overallScore: number;
		overallLabel: string;
		pillars: DashboardSourcePillar[];
	};
	trend: Array<{ month: string; income: number; expense: number }>;
	budgets: DashboardSourceBudget[];
	incomeCategories: Array<{ id: string; name: string }>;
	expenseCategories: Array<{ id: string; name: string }>;
	transactions: DashboardSourceTransaction[];
}
```

- [ ] **Step 5: Add action, quality, evidence, focus, and activity helpers**

Continue the same file with the exact action, quality, evidence, and mapping rules:

```ts
const PILLAR_ACTIONS: Record<HealthPillarName, DashboardAction> = {
	Solvency: { kind: 'link', href: '/accounts', label: 'Review debt' },
	Liquidity: { kind: 'link', href: '/goals', label: 'Build your buffer' },
	Savings: { kind: 'link', href: '/budgets', label: 'Find room to save' },
	'Debt Management': {
		kind: 'quick-action',
		action: 'payment',
		label: 'Pay down debt',
	},
	'Cash Flow': {
		kind: 'link',
		href: '/transactions',
		label: 'Review cash flow',
	},
};

function classifyDataQuality(
	dashboard: DashboardSourceSummary
): DashboardDataQuality {
	const hasAccount = dashboard.accounts.some(
		(account) => account.type !== 'TITHE'
	);
	const hasFlow = dashboard.ytdIncome > 0 || dashboard.ytdExpense > 0;
	if (!hasAccount && !hasFlow) return 'empty';
	if (hasAccount && !hasFlow) return 'partial';
	if (hasAccount && hasFlow) return 'complete';
	return 'partial';
}

function toneForScore(score: number | null): DashboardTone {
	if (score === null) return 'neutral';
	if (score >= 75) return 'positive';
	if (score >= 60) return 'warning';
	return 'negative';
}

function evidenceFor(
	name: HealthPillarName,
	source: DashboardOverviewSource,
	quality: DashboardDataQuality
): string {
	const data = source.dashboard;
	if (quality === 'empty') return 'Account and transaction history required';
	if (
		quality === 'partial' &&
		(name === 'Savings' || name === 'Cash Flow')
	) {
		return 'Income and expense history required';
	}
	if (name === 'Solvency') {
		return data.totalDebt === 0
			? 'Debt-free'
			: data.debtToAssetRatio.toFixed(1) + '% debt-to-asset';
	}
	if (name === 'Liquidity') {
		return data.runwayMonths === null
			? 'Runway needs expense data'
			: data.runwayMonths.toFixed(1) + ' months of runway';
	}
	if (name === 'Savings') {
		return data.savingsRate.toFixed(1) + '% YTD savings rate';
	}
	if (name === 'Debt Management') {
		if (data.totalDebt === 0) return 'Debt-free';
		if (data.totalCreditLimit > 0) {
			return data.creditUtilization.toFixed(1) + '% credit utilization';
		}
		return formatCurrency(data.totalDebt, {
			currency: source.currency,
			decimals: 0,
		}) + ' total debt';
	}
	return (
		formatCurrency(data.income, {
			currency: source.currency,
			decimals: 0,
		}) +
		' in · ' +
		formatCurrency(data.expense, {
			currency: source.currency,
			decimals: 0,
		}) +
		' out'
	);
}

function buildPillars(
	source: DashboardOverviewSource,
	quality: DashboardDataQuality
): DashboardPillarRow[] {
	const byName = new Map(
		source.health.pillars.map((pillar) => [pillar.name, pillar])
	);

	return HEALTH_PILLARS.map((definition) => {
		const raw = byName.get(definition.name);
		if (!raw) {
			throw new Error('Missing health pillar: ' + definition.name);
		}
		const supported =
			quality === 'complete' ||
			(quality === 'partial' &&
				definition.name !== 'Savings' &&
				definition.name !== 'Cash Flow');
		return {
			name: definition.name,
			question: definition.question,
			weight: definition.weight,
			score: supported ? raw.score : null,
			grade: supported ? raw.grade : null,
			status: supported ? 'supported' : 'needs-data',
			tone: toneForScore(supported ? raw.score : null),
			evidence: evidenceFor(definition.name, source, quality),
			recommendation: supported ? raw.recommendation : null,
			action:
				quality === 'partial' && definition.name === 'Savings'
					? { kind: 'quick-action', action: 'income', label: 'Add income' }
					: quality === 'partial' && definition.name === 'Cash Flow'
						? { kind: 'quick-action', action: 'expense', label: 'Add expense' }
						: PILLAR_ACTIONS[definition.name],
		};
	});
}

function chooseFocus(pillars: DashboardPillarRow[]): DashboardPillarRow | null {
	const order = new Map(
		HEALTH_PILLARS.map((pillar, index) => [pillar.name, index])
	);
	return (
		[...pillars]
			.filter(
				(pillar) =>
					pillar.status === 'supported' &&
					pillar.grade !== 'A' &&
					pillar.score !== null
			)
			.sort(
				(a, b) =>
					(a.score as number) - (b.score as number) ||
					b.weight - a.weight ||
					(order.get(a.name) as number) - (order.get(b.name) as number)
			)[0] ?? null
	);
}

function mapActivity(
	transaction: DashboardSourceTransaction
): DashboardOverview['recentActivity'][number] {
	if (transaction.kind === 'income') {
		return {
			id: transaction.id,
			kind: 'income',
			title: transaction.description?.trim() || transaction.categoryName,
			context: [transaction.categoryName, transaction.accountName]
				.filter(Boolean)
				.join(' · '),
			amount: transaction.amount,
			direction: 'in',
			date: transaction.date,
		};
	}
	if (transaction.kind === 'expense') {
		return {
			id: transaction.id,
			kind: 'expense',
			title: transaction.description?.trim() || transaction.categoryName,
			context: [transaction.categoryName, transaction.accountName]
				.filter(Boolean)
				.join(' · '),
			amount: transaction.amount,
			direction: 'out',
			date: transaction.date,
		};
	}
	const kind = transaction.isPayment ? 'payment' : 'transfer';
	return {
		id: transaction.id,
		kind,
		title:
			transaction.description?.trim() ||
			(transaction.isPayment ? 'Debt payment' : 'Transfer'),
		context:
			transaction.fromAccountName + ' → ' + transaction.toAccountName,
		amount: transaction.amount,
		direction: 'neutral',
		date: transaction.date,
	};
}
```

- [ ] **Step 6: Assemble the public DTO without raw service objects**

Finish `buildDashboardOverview` with explicit totals and no raw service objects:

```ts
export function buildDashboardOverview(
	source: DashboardOverviewSource,
	now: Date
): DashboardOverview {
	const dataQuality = classifyDataQuality(source.dashboard);
	const pillars = buildPillars(source, dataQuality);
	const focusPillar = chooseFocus(pillars);
	const activeAccounts = source.dashboard.accounts.filter(
		(account) => !account.isArchived && account.type !== 'TITHE'
	);
	const assetAccounts = activeAccounts.filter(
		(account) => !account.isLiability
	);
	const liabilityAccounts = activeAccounts.filter(
		(account) => account.isLiability
	);
	const hasAccount = activeAccounts.length > 0;
	const hasTransferPair = activeAccounts.length > 1;
	const hasPaymentPair =
		assetAccounts.length > 0 && liabilityAccounts.length > 0;
	const totalBudgeted = source.budgets.reduce(
		(sum, budget) => sum + budget.amount,
		0
	);
	const totalSpent = source.budgets.reduce(
		(sum, budget) => sum + budget.spent,
		0
	);
	const points = source.trend.map((point) => ({
		month: point.month,
		income: point.income,
		expense: point.expense,
		surplus: point.income - point.expense,
	}));
	const totalIncome = points.reduce((sum, point) => sum + point.income, 0);
	const totalExpense = points.reduce((sum, point) => sum + point.expense, 0);

	return {
		snapshotLabel: format(now, 'MMMM yyyy'),
		currency: source.currency,
		dataQuality,
		quickActions: {
			accounts: activeAccounts.map((account) => ({
				id: account.id,
				name: account.name,
				type: account.type,
				balance: account.balance,
				isLiability: account.isLiability,
			})),
			incomeCategories: source.incomeCategories.map((category) => ({
				id: category.id,
				name: category.name,
			})),
			expenseCategories: source.expenseCategories.map((category) => ({
				id: category.id,
				name: category.name,
			})),
			budgets: source.budgets.map((budget) => ({
				id: budget.id,
				name: budget.name,
				categoryId: budget.categoryId,
				categoryName: budget.categoryName,
			})),
			availability: {
				income: {
					enabled: hasAccount,
					disabledReason: hasAccount ? null : 'Add an account first',
				},
				expense: {
					enabled: hasAccount,
					disabledReason: hasAccount ? null : 'Add an account first',
				},
				transfer: {
					enabled: hasTransferPair,
					disabledReason: hasTransferPair
						? null
						: 'Add at least two accounts first',
				},
				payment: {
					enabled: hasPaymentPair,
					disabledReason: hasPaymentPair
						? null
						: 'Add an asset and a liability account first',
				},
			},
		},
		health: {
			verdict:
				dataQuality === 'complete'
					? {
							score: source.health.overallScore,
							label: source.health.overallLabel,
							description: getHealthLabelDescription(
								source.health.overallLabel
							),
							tone: toneForScore(source.health.overallScore),
							focus: focusPillar
								? {
										pillarName: focusPillar.name,
										grade: focusPillar.grade,
										recommendation:
											focusPillar.recommendation as string,
										action: focusPillar.action,
									}
								: {
										pillarName: null,
										grade: null,
										recommendation: 'All five pillars are graded A.',
										action: {
											kind: 'link',
											href: '/reports',
											label: 'Open full report',
										},
									},
						}
					: null,
			pillars,
		},
		evidence: {
			netWorth: source.dashboard.netWorth,
			income: source.dashboard.income,
			expense: source.dashboard.expense,
			surplus: source.dashboard.income - source.dashboard.expense,
		},
		cashFlow: {
			points,
			hasActivity: totalIncome > 0 || totalExpense > 0,
			totalIncome,
			totalExpense,
			net: totalIncome - totalExpense,
		},
		budgetPressure: {
			hasBudgets: source.budgets.length > 0,
			totalBudgeted,
			totalSpent,
			utilizationPercent:
				totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : null,
			items: [...source.budgets]
				.sort((a, b) => b.percentage - a.percentage)
				.slice(0, 3)
				.map((budget) => ({
					id: budget.id,
					name: budget.name,
					categoryName: budget.categoryName,
					amount: budget.amount,
					spent: budget.spent,
					percentage: budget.percentage,
				})),
		},
		accountsDebt: {
			liquidAssets: source.dashboard.liquidAssets,
			liabilities: source.dashboard.liabilities,
			netWorth: source.dashboard.netWorth,
			creditUtilization:
				source.dashboard.totalCreditLimit > 0
					? source.dashboard.creditUtilization
					: null,
		},
		recentActivity: source.transactions.slice(0, 8).map(mapActivity),
	};
}
```

- [ ] **Step 7: Run the presenter tests and type-aware lint**

Run:

```bash
docker compose exec app npm run test -- server/modules/dashboard/dashboard.presenter.test.ts
docker compose exec app npm run lint -- server/modules/dashboard/dashboard.types.ts server/modules/dashboard/dashboard.presenter.ts server/modules/dashboard/dashboard.presenter.test.ts
```

Expected: presenter tests PASS and ESLint reports no errors.

- [ ] **Step 8: Commit and push Task 2**

```bash
git add server/modules/dashboard/dashboard.types.ts server/modules/dashboard/dashboard.presenter.ts server/modules/dashboard/dashboard.presenter.test.ts
git commit -m "feat: build dashboard health ledger view model"
git push origin main
```

---

### Task 3: Add the sole dashboard read controller

**Files:**

- Create: `server/modules/dashboard/dashboard.controller.ts`
- Create: `server/modules/dashboard/dashboard.controller.test.ts`

**Interfaces:**

- Consumes: `getAuthenticatedUser(): Promise<string>`, existing service methods, and `buildDashboardOverview(source, now)` from Task 2.
- Produces: `getDashboardOverviewAction(): Promise<{ success: true; data: DashboardOverview } | { error: string }>`.

- [ ] **Step 1: Write the failing controller orchestration tests**

Create `server/modules/dashboard/dashboard.controller.test.ts`. Mock the presenter so this test owns orchestration rather than retesting presentation:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getDashboardData: vi.fn(),
	getFinancialHealthScore: vi.fn(),
	getIncomeExpenseTrend: vi.fn(),
	getBudgets: vi.fn(),
	getUnifiedTransactions: vi.fn(),
	getCurrency: vi.fn(),
	getCategories: vi.fn(),
	buildDashboardOverview: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock('./dashboard.service', () => ({
	DashboardService: {
		getDashboardData: mocks.getDashboardData,
		getFinancialHealthScore: mocks.getFinancialHealthScore,
		getIncomeExpenseTrend: mocks.getIncomeExpenseTrend,
	},
}));
vi.mock('@/server/modules/budget/budget.service', () => ({
	BudgetService: { getBudgets: mocks.getBudgets },
}));
vi.mock('@/server/modules/transaction/transaction.service', () => ({
	TransactionService: {
		getUnifiedTransactions: mocks.getUnifiedTransactions,
	},
}));
vi.mock('@/server/modules/user/user.service', () => ({
	UserService: { getCurrency: mocks.getCurrency },
}));
vi.mock('@/server/modules/category/category.service', () => ({
	CategoryService: { getCategories: mocks.getCategories },
}));
vi.mock('./dashboard.presenter', () => ({
	buildDashboardOverview: mocks.buildDashboardOverview,
}));

import { getDashboardOverviewAction } from './dashboard.controller';

describe('getDashboardOverviewAction', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 16, 9, 0, 0));
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
		mocks.getDashboardData.mockResolvedValue({
			accounts: [
				{
					id: 'a1',
					name: 'Main Bank',
					type: 'BANK',
					balance: '1200.50',
					isLiability: false,
					isArchived: false,
				},
			],
			netWorth: 1200.5,
			assets: 1200.5,
			liabilities: 0,
			savingsRate: 20,
			runwayMonths: 3,
			creditUtilization: 0,
			totalCreditUsed: 0,
			totalCreditLimit: 0,
			totalDebt: 0,
			debtPaydown: 0,
			debtToAssetRatio: 0,
			liquidAssets: 1200.5,
			ytdIncome: 5000,
			ytdExpense: 4000,
			income: 1000,
			expense: 700,
		});
		mocks.getFinancialHealthScore.mockResolvedValue({
			overallScore: 80,
			overallLabel: 'Good',
			pillars: [],
		});
		mocks.getIncomeExpenseTrend.mockResolvedValue([]);
		mocks.getBudgets.mockResolvedValue([
			{
				id: 'b1',
				name: 'Food',
				categoryId: 'c1',
				category: { name: 'Food' },
				amount: '1000',
				spent: 500,
				percentage: 50,
			},
		]);
		mocks.getUnifiedTransactions.mockResolvedValue({
			data: [],
			total: 0,
			page: 1,
			pageSize: 8,
		});
		mocks.getCurrency.mockResolvedValue('PHP');
		mocks.getCategories
			.mockResolvedValueOnce([{ id: 'i1', name: 'Salary' }])
			.mockResolvedValueOnce([{ id: 'e1', name: 'Food' }]);
		mocks.buildDashboardOverview.mockReturnValue({
			snapshotLabel: 'August 2026',
		});
	});

	it('authenticates, aggregates each source once, and normalizes money', async () => {
		const result = await getDashboardOverviewAction();

		expect(result).toEqual({
			success: true,
			data: { snapshotLabel: 'August 2026' },
		});
		expect(mocks.getDashboardData).toHaveBeenCalledOnce();
		expect(mocks.getUnifiedTransactions).toHaveBeenCalledWith('user-1', {
			page: 1,
			pageSize: 8,
			sortBy: 'date',
			sortOrder: 'desc',
		});
		expect(mocks.getBudgets).toHaveBeenCalledWith('user-1', {
			month: new Date(2026, 7, 16, 9, 0, 0),
		});
		expect(mocks.buildDashboardOverview).toHaveBeenCalledWith(
			expect.objectContaining({
				currency: 'PHP',
				dashboard: expect.objectContaining({
					accounts: [
						expect.objectContaining({ id: 'a1', balance: 1200.5 }),
					],
				}),
				budgets: [
					expect.objectContaining({ id: 'b1', amount: 1000 }),
				],
			}),
			new Date(2026, 7, 16, 9, 0, 0)
		);
	});

	it('returns one safe error without exposing the thrown message', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getDashboardData.mockRejectedValue(new Error('database details'));

		await expect(getDashboardOverviewAction()).resolves.toEqual({
			error: 'Failed to load dashboard',
		});
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load dashboard:',
			expect.any(Error)
		);
		consoleError.mockRestore();
	});
});
```

- [ ] **Step 2: Run the controller test and confirm the missing action failure**

Run:

```bash
docker compose exec app npm run test -- server/modules/dashboard/dashboard.controller.test.ts
```

Expected: FAIL because `dashboard.controller.ts` does not exist.

- [ ] **Step 3: Implement the authenticated parallel aggregator**

Create `server/modules/dashboard/dashboard.controller.ts`:

```ts
'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { TransactionService } from '@/server/modules/transaction/transaction.service';
import { UserService } from '@/server/modules/user/user.service';
import { buildDashboardOverview } from './dashboard.presenter';
import { DashboardService } from './dashboard.service';
import type { DashboardOverview } from './dashboard.types';

type DashboardOverviewResult =
	| { success: true; data: DashboardOverview }
	| { error: string };

export async function getDashboardOverviewAction(): Promise<DashboardOverviewResult> {
	try {
		const userId = await getAuthenticatedUser();
		const now = new Date();
		const [
			dashboard,
			health,
			trend,
			budgets,
			transactions,
			currency,
			incomeCategories,
			expenseCategories,
		] = await Promise.all([
			DashboardService.getDashboardData(userId),
			DashboardService.getFinancialHealthScore(userId),
			DashboardService.getIncomeExpenseTrend(userId),
			BudgetService.getBudgets(userId, { month: now }),
			TransactionService.getUnifiedTransactions(userId, {
				page: 1,
				pageSize: 8,
				sortBy: 'date',
				sortOrder: 'desc',
			}),
			UserService.getCurrency(userId),
			CategoryService.getCategories(userId, 'INCOME'),
			CategoryService.getCategories(userId, 'EXPENSE'),
		]);

		const data = buildDashboardOverview(
			{
				currency,
				dashboard: {
					accounts: dashboard.accounts.map((account) => ({
						id: account.id,
						name: account.name,
						type: account.type,
						balance: Number(account.balance),
						isLiability: account.isLiability,
						isArchived: account.isArchived,
					})),
					netWorth: dashboard.netWorth,
					assets: dashboard.assets,
					liabilities: dashboard.liabilities,
					savingsRate: dashboard.savingsRate,
					runwayMonths: dashboard.runwayMonths,
					creditUtilization: dashboard.creditUtilization,
					totalCreditUsed: dashboard.totalCreditUsed,
					totalCreditLimit: dashboard.totalCreditLimit,
					totalDebt: dashboard.totalDebt,
					debtPaydown: dashboard.debtPaydown,
					debtToAssetRatio: dashboard.debtToAssetRatio,
					liquidAssets: dashboard.liquidAssets,
					ytdIncome: dashboard.ytdIncome,
					ytdExpense: dashboard.ytdExpense,
					income: dashboard.income,
					expense: dashboard.expense,
				},
				health: {
					overallScore: health.overallScore,
					overallLabel: health.overallLabel,
					pillars: health.pillars.map((pillar) => ({
						name: pillar.name,
						score: pillar.score,
						grade: pillar.grade,
						weight: pillar.weight,
						details: pillar.details,
						recommendation: pillar.recommendation,
					})),
				},
				trend: trend.map((point) => ({
					month: point.month,
					income: point.income,
					expense: point.expense,
				})),
				budgets: budgets.map((budget) => ({
					id: budget.id,
					name: budget.name,
					categoryId: budget.categoryId,
					categoryName: budget.category.name,
					amount: Number(budget.amount),
					spent: budget.spent,
					percentage: budget.percentage,
				})),
				incomeCategories: incomeCategories.map((category) => ({
					id: category.id,
					name: category.name,
				})),
				expenseCategories: expenseCategories.map((category) => ({
					id: category.id,
					name: category.name,
				})),
				transactions: transactions.data,
			},
			now
		);

		return { success: true, data };
	} catch (error) {
		console.error('Failed to load dashboard:', error);
		return { error: 'Failed to load dashboard' };
	}
}
```

- [ ] **Step 4: Run controller and presenter tests together**

Run:

```bash
docker compose exec app npm run test -- server/modules/dashboard/dashboard.controller.test.ts server/modules/dashboard/dashboard.presenter.test.ts
docker compose exec app npm run lint -- server/modules/dashboard/dashboard.controller.ts server/modules/dashboard/dashboard.controller.test.ts
```

Expected: both test files PASS and ESLint reports no errors.

- [ ] **Step 5: Commit and push Task 3**

```bash
git add server/modules/dashboard/dashboard.controller.ts server/modules/dashboard/dashboard.controller.test.ts
git commit -m "feat: add consolidated dashboard read action"
git push origin main
```

---

### Task 4: Build and prove the Health Ledger first viewport

**Files:**

- Create: `components/modules/dashboard/dashboard-styles.ts`
- Create: `components/modules/dashboard/DashboardActionButton.tsx`
- Create: `components/modules/dashboard/DashboardHeader.tsx`
- Create: `components/modules/dashboard/DashboardStatePanels.tsx`
- Create: `components/modules/dashboard/FinancialHealthVerdict.tsx`
- Create: `components/modules/dashboard/HealthLedger.tsx`
- Create: `components/modules/dashboard/DashboardEvidenceStrip.tsx`
- Modify: `components/modules/dashboard/QuickActionSheet.tsx:82-103`
- Modify: `app/(authenticated)/dashboard/page.tsx:1-277`
- Evidence: `.impeccable/review/hero-repro.png`

**Interfaces:**

- Consumes: `DashboardOverview`, `DashboardAction`, `DashboardTone`, `DashboardQuickActionKind`, and the unchanged `QuickActionProvider` behavior.
- Produces: a working controller-backed `/dashboard` containing the header, empty/error state, verdict, five ledger rows, and evidence strip; `DashboardActionButton({ action, variant?, size?, className? })` opens a sheet or follows a real route.

- [ ] **Step 1: Load the design execution context before UI edits**

Run once from the project root:

```bash
node /home/blank/.codex/skills/impeccable/scripts/context.mjs --target 'app/(authenticated)/dashboard/page.tsx'
```

Read the emitted directives, the approved surface brief, and the approved comp. Immediately before the first TSX edit, load the Impeccable craft floor. This is the point where the Impeccable skill causes the implementation to pause for its quality floor; resume only after those constraints are in context.

- [ ] **Step 2: Export the existing quick-action option interfaces**

In `QuickActionSheet.tsx`, change the three private option interfaces to exports without changing their fields:

```tsx
export interface QuickActionAccountOption {
	id: string;
	name: string;
	type: string;
	balance: number;
	isLiability: boolean;
}

export interface QuickActionCategoryOption {
	id: string;
	name: string;
}

export interface QuickActionBudgetOption {
	id: string;
	name: string;
	categoryId: string;
	categoryName: string;
}
```

Update `QuickActionSheetProps` and the form prop annotations to use these names. Do not change any form fields, submit handlers, mutation controllers, cache behavior, or success/error messages.

- [ ] **Step 3: Add semantic tone styles and the action renderer**

Create `components/modules/dashboard/dashboard-styles.ts`:

```ts
import type { DashboardTone } from '@/server/modules/dashboard/dashboard.types';

export const DASHBOARD_TONE_STYLES: Record<
	DashboardTone,
	{ text: string; badge: string; marker: string }
> = {
	positive: {
		text: 'text-emerald-700 dark:text-emerald-300',
		badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
		marker: 'bg-emerald-500',
	},
	warning: {
		text: 'text-amber-700 dark:text-amber-300',
		badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
		marker: 'bg-amber-500',
	},
	negative: {
		text: 'text-red-700 dark:text-red-300',
		badge: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
		marker: 'bg-red-500',
	},
	neutral: {
		text: 'text-muted-foreground',
		badge: 'bg-muted text-muted-foreground',
		marker: 'bg-muted-foreground',
	},
};
```

Create `DashboardActionButton.tsx`:

```tsx
'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardAction } from '@/server/modules/dashboard/dashboard.types';
import { useQuickAction } from './QuickActionSheet';

interface DashboardActionButtonProps {
	action: DashboardAction;
	variant?: ComponentProps<typeof Button>['variant'];
	size?: ComponentProps<typeof Button>['size'];
	className?: string;
}

export function DashboardActionButton({
	action,
	variant = 'outline',
	size = 'sm',
	className,
}: DashboardActionButtonProps) {
	const { openSheet } = useQuickAction();

	if (action.kind === 'link') {
		return (
			<Button asChild variant={variant} size={size} className={className}>
				<Link href={action.href}>
					{action.label}
					<ArrowUpRight aria-hidden='true' />
				</Link>
			</Button>
		);
	}

	return (
		<Button
			type='button'
			variant={variant}
			size={size}
			className={cn('justify-center', className)}
			onClick={() => openSheet(action.action)}
		>
			{action.label}
		</Button>
	);
}
```

- [ ] **Step 4: Build the compact header with real quick actions**

Create `DashboardHeader.tsx` as a client island. Use `Plus`, `Minus`, `ArrowLeftRight`, and `CreditCard` from Lucide; do not create icon tiles:

```tsx
'use client';

import { ArrowLeftRight, CreditCard, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
	DashboardOverview,
	DashboardQuickActionKind,
} from '@/server/modules/dashboard/dashboard.types';
import { useQuickAction } from './QuickActionSheet';

const ACTIONS: Array<{
	kind: DashboardQuickActionKind;
	label: string;
	icon: typeof Plus;
}> = [
	{ kind: 'income', label: 'Add income', icon: Plus },
	{ kind: 'expense', label: 'Add expense', icon: Minus },
	{ kind: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
	{ kind: 'payment', label: 'Pay debt', icon: CreditCard },
];

export function DashboardHeader({
	snapshotLabel,
	availability,
}: {
	snapshotLabel: string;
	availability: DashboardOverview['quickActions']['availability'];
}) {
	const { openSheet } = useQuickAction();

	return (
		<header className='flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
			<div>
				<h1 className='text-3xl font-semibold tracking-[-0.03em] sm:text-4xl'>
					Dashboard
				</h1>
				<p className='mt-1 text-sm text-muted-foreground'>
					Current snapshot · {snapshotLabel}
				</p>
			</div>
			<div
				className='grid grid-cols-2 gap-2 sm:flex'
				aria-label='Quick actions'
			>
				{ACTIONS.map(({ kind, label, icon: Icon }, index) => {
					const state = availability[kind];
					return (
						<Button
							key={kind}
							type='button'
							variant={index === 0 ? 'default' : 'outline'}
							disabled={!state.enabled}
							title={state.disabledReason ?? undefined}
							onClick={() => openSheet(kind)}
						>
							<Icon aria-hidden='true' />
							{label}
						</Button>
					);
				})}
			</div>
		</header>
	);
}
```

- [ ] **Step 5: Build factual empty/error states and the verdict band**

Create `DashboardStatePanels.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState() {
	return (
		<section
			className='border-y py-14 sm:py-20'
			aria-labelledby='dashboard-empty-title'
		>
			<div className='max-w-2xl'>
				<h2
					id='dashboard-empty-title'
					className='text-2xl font-semibold tracking-[-0.025em] sm:text-3xl'
				>
					Your dashboard needs real data.
				</h2>
				<p className='mt-3 max-w-[65ch] text-muted-foreground'>
					Add an account, then record income and expenses. Financial health
					only appears when there is enough evidence to judge it.
				</p>
				<Button asChild className='mt-6'>
					<Link href='/accounts'>Add account</Link>
				</Button>
			</div>
		</section>
	);
}

export function DashboardErrorState() {
	const router = useRouter();
	return (
		<section className='mx-auto max-w-xl border-y py-14 text-center'>
			<h1 className='text-2xl font-semibold tracking-[-0.025em]'>
				The dashboard did not load.
			</h1>
			<p className='mt-3 text-muted-foreground'>
				Your data was not changed. Retry the snapshot or open Transactions.
			</p>
			<div className='mt-6 flex justify-center gap-2'>
				<Button type='button' onClick={() => router.refresh()}>
					Try again
				</Button>
				<Button variant='outline' asChild>
					<Link href='/transactions'>Open Transactions</Link>
				</Button>
			</div>
		</section>
	);
}
```

Create `FinancialHealthVerdict.tsx`:

```tsx
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { DASHBOARD_TONE_STYLES } from './dashboard-styles';
import { DashboardActionButton } from './DashboardActionButton';

export function FinancialHealthVerdict({
	health,
}: {
	health: DashboardOverview['health'];
}) {
	if (!health.verdict) {
		return (
			<section className='grid gap-6 border-y bg-muted/25 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
				<div>
					<h2 className='text-xl font-semibold tracking-[-0.02em]'>
						More activity is needed for a diagnosis.
					</h2>
					<p className='mt-2 max-w-[65ch] text-sm text-muted-foreground'>
						Your balances are available, but savings and cash flow need
						income and expense history before the score is credible.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<DashboardActionButton
						action={{ kind: 'quick-action', action: 'income', label: 'Add income' }}
						variant='default'
					/>
					<DashboardActionButton
						action={{ kind: 'quick-action', action: 'expense', label: 'Add expense' }}
					/>
				</div>
			</section>
		);
	}

	const { verdict } = health;
	const tone = DASHBOARD_TONE_STYLES[verdict.tone];
	return (
		<section
			className='grid gap-7 border-y bg-muted/25 py-7 sm:px-6 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(16rem,0.7fr)] lg:items-center'
			aria-labelledby='financial-health-title'
		>
			<div>
				<p className='text-sm font-medium text-muted-foreground'>
					Financial health
				</p>
				<p className='mt-1 font-mono text-5xl font-semibold tabular-nums tracking-[-0.04em]'>
					{verdict.score}
					<span className='text-lg text-muted-foreground'>/100</span>
				</p>
			</div>
			<div>
				<h2
					id='financial-health-title'
					className={'text-2xl font-semibold tracking-[-0.025em] ' + tone.text}
				>
					{verdict.label}
				</h2>
				<p className='mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground'>
					{verdict.description}
				</p>
			</div>
			<div className='border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0'>
				<p className='text-sm font-medium'>
					{verdict.focus.pillarName
						? 'Focus: ' + verdict.focus.pillarName
						: 'No weak pillar'}
				</p>
				<p className='mt-1 text-sm leading-6 text-muted-foreground'>
					{verdict.focus.recommendation}
				</p>
				<DashboardActionButton
					action={verdict.focus.action}
					variant='default'
					className='mt-4'
				/>
			</div>
		</section>
	);
}
```

- [ ] **Step 6: Build the fixed-order ledger and evidence strip**

Create `HealthLedger.tsx`. Use `Shield`, `Droplets`, `PiggyBank`, `CreditCard`, and `ArrowLeftRight` from Lucide, mapped by pillar name. The list and its header must use the same desktop grid:

```tsx
import {
	ArrowLeftRight,
	CreditCard,
	Droplets,
	PiggyBank,
	Shield,
} from 'lucide-react';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';
import { DASHBOARD_TONE_STYLES } from './dashboard-styles';
import { DashboardActionButton } from './DashboardActionButton';

const ICONS = {
	Solvency: Shield,
	Liquidity: Droplets,
	Savings: PiggyBank,
	'Debt Management': CreditCard,
	'Cash Flow': ArrowLeftRight,
};

export function HealthLedger({
	pillars,
}: {
	pillars: DashboardOverview['health']['pillars'];
}) {
	return (
		<section aria-labelledby='health-ledger-title'>
			<div className='flex items-end justify-between gap-4'>
				<div>
					<h2
						id='health-ledger-title'
						className='text-xl font-semibold tracking-[-0.02em]'
					>
						Health Ledger
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						Five questions. One comparable view.
					</p>
				</div>
				<span className='text-sm text-muted-foreground'>100% total weight</span>
			</div>
			<div className='mt-5 hidden grid-cols-[minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)_auto] gap-6 border-b pb-2 text-xs font-medium text-muted-foreground md:grid'>
				<span>Pillar</span>
				<span>Grade</span>
				<span>Evidence</span>
				<span className='text-right'>Next action</span>
			</div>
			<ol>
				{pillars.map((pillar) => {
					const Icon = ICONS[pillar.name];
					const tone = DASHBOARD_TONE_STYLES[pillar.tone];
					return (
						<li
							key={pillar.name}
							className='grid gap-4 border-b py-5 md:grid-cols-[minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)_auto] md:items-center md:gap-6'
						>
							<div className='flex gap-3'>
								<Icon
									aria-hidden='true'
									className={'mt-0.5 size-4 shrink-0 ' + tone.text}
								/>
								<div>
									<h3 className='font-medium'>{pillar.name}</h3>
									<p className='mt-0.5 text-sm text-muted-foreground'>
										{pillar.question}
									</p>
									<p className='mt-1 text-xs text-muted-foreground'>
										{Math.round(pillar.weight * 100)}% weight
									</p>
								</div>
							</div>
							<div className='flex items-center gap-2'>
								<span
									className={'size-2 rounded-full ' + tone.marker}
									aria-hidden='true'
								/>
								<span className={'rounded-md px-2 py-1 text-xs font-semibold ' + tone.badge}>
									{pillar.status === 'needs-data'
										? 'Needs data'
										: pillar.grade + ' · ' + pillar.score}
								</span>
							</div>
							<p className='text-sm text-muted-foreground'>
								{pillar.evidence}
							</p>
							<DashboardActionButton
								action={pillar.action}
								variant='ghost'
								className='justify-self-start md:justify-self-end'
							/>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
```

Create `DashboardEvidenceStrip.tsx`:

```tsx
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function DashboardEvidenceStrip({
	evidence,
	currency,
}: {
	evidence: DashboardOverview['evidence'];
	currency: string;
}) {
	const values = [
		{ label: 'Net worth', value: evidence.netWorth, tone: '' },
		{ label: 'Income this month', value: evidence.income, tone: 'text-emerald-700 dark:text-emerald-300' },
		{ label: 'Expenses this month', value: evidence.expense, tone: 'text-red-700 dark:text-red-300' },
		{
			label: evidence.surplus >= 0 ? 'Surplus this month' : 'Deficit this month',
			value: evidence.surplus,
			tone:
				evidence.surplus >= 0
					? 'text-emerald-700 dark:text-emerald-300'
					: 'text-red-700 dark:text-red-300',
		},
	];

	return (
		<dl className='grid border-y sm:grid-cols-2 lg:grid-cols-4'>
			{values.map((item) => (
				<div
					key={item.label}
					className='border-b py-4 sm:px-5 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0'
				>
					<dt className='text-xs font-medium text-muted-foreground'>
						{item.label}
					</dt>
					<dd className={'mt-1 font-mono text-xl font-semibold tabular-nums ' + item.tone}>
						{formatCurrency(item.value, { currency })}
					</dd>
				</div>
			))}
		</dl>
	);
}
```

- [ ] **Step 7: Replace the dashboard route with the core Health Ledger**

Rewrite `app/(authenticated)/dashboard/page.tsx` so it has no `auth` call and no service imports:

```tsx
import { getDashboardOverviewAction } from '@/server/modules/dashboard/dashboard.controller';
import { DashboardHeader } from '@/components/modules/dashboard/DashboardHeader';
import {
	DashboardEmptyState,
	DashboardErrorState,
} from '@/components/modules/dashboard/DashboardStatePanels';
import { FinancialHealthVerdict } from '@/components/modules/dashboard/FinancialHealthVerdict';
import { HealthLedger } from '@/components/modules/dashboard/HealthLedger';
import { DashboardEvidenceStrip } from '@/components/modules/dashboard/DashboardEvidenceStrip';
import { QuickActionProvider } from '@/components/modules/dashboard/QuickActionSheet';

export default async function DashboardPage() {
	const result = await getDashboardOverviewAction();
	if ('error' in result) {
		return (
			<div className='container mx-auto py-6 md:py-10'>
				<DashboardErrorState />
			</div>
		);
	}

	const overview = result.data;
	return (
		<QuickActionProvider
			accounts={overview.quickActions.accounts}
			incomeCategories={overview.quickActions.incomeCategories}
			expenseCategories={overview.quickActions.expenseCategories}
			budgets={overview.quickActions.budgets}
		>
			<div className='container mx-auto space-y-8 py-6 md:py-10'>
				<DashboardHeader
					snapshotLabel={overview.snapshotLabel}
					availability={overview.quickActions.availability}
				/>
				{overview.dataQuality === 'empty' ? (
					<DashboardEmptyState />
				) : (
					<>
						<FinancialHealthVerdict health={overview.health} />
						<HealthLedger pillars={overview.health.pillars} />
						<DashboardEvidenceStrip
							evidence={overview.evidence}
							currency={overview.currency}
						/>
					</>
				)}
			</div>
		</QuickActionProvider>
	);
}
```

- [ ] **Step 8: Verify the core route before building below the fold**

Run:

```bash
docker compose exec app npm run test -- lib/financial-health-copy.test.ts server/modules/dashboard/dashboard.presenter.test.ts server/modules/dashboard/dashboard.controller.test.ts
docker compose exec app npm run lint -- 'app/(authenticated)/dashboard/page.tsx' components/modules/dashboard/DashboardActionButton.tsx components/modules/dashboard/DashboardHeader.tsx components/modules/dashboard/DashboardStatePanels.tsx components/modules/dashboard/FinancialHealthVerdict.tsx components/modules/dashboard/HealthLedger.tsx components/modules/dashboard/DashboardEvidenceStrip.tsx components/modules/dashboard/dashboard-styles.ts components/modules/dashboard/QuickActionSheet.tsx
docker compose exec app npm run build
```

Expected: all focused tests PASS, lint is clean, and Next.js builds successfully.

- [ ] **Step 9: Capture the required first-viewport checkpoint**

Ensure the Docker app is running:

```bash
docker compose up -d app
```

Use the Browser skill against `http://localhost:3000/dashboard` with an authenticated generic test account. Set the viewport to 1536×1024, settle all loading, capture the page from the document top to `.impeccable/review/hero-repro.png`, and open both that image and `.impeccable/mocks/decision/health-ledger.png` side by side. Before continuing, correct in one batch any mismatch in:

- verdict and ledger dominance;
- desktop column alignment;
- amount scale and density;
- action placement;
- duplicated shell;
- horizontal overflow;
- decorative cards, shadows, or motion that the comp does not authorize.

Do not build lower panels until this checkpoint exists and has been visually inspected.

- [ ] **Step 10: Commit and push the proven first viewport**

```bash
git add 'app/(authenticated)/dashboard/page.tsx' components/modules/dashboard/dashboard-styles.ts components/modules/dashboard/DashboardActionButton.tsx components/modules/dashboard/DashboardHeader.tsx components/modules/dashboard/DashboardStatePanels.tsx components/modules/dashboard/FinancialHealthVerdict.tsx components/modules/dashboard/HealthLedger.tsx components/modules/dashboard/DashboardEvidenceStrip.tsx components/modules/dashboard/QuickActionSheet.tsx .impeccable/review/hero-repro.png
git commit -m "feat: build dashboard health ledger"
git push origin main
```

---

### Task 5: Add the lower operating evidence

**Files:**

- Create: `components/modules/dashboard/CashFlowTrend.tsx`
- Create: `components/modules/dashboard/BudgetPressure.tsx`
- Create: `components/modules/dashboard/AccountsDebtSummary.tsx`
- Create: `components/modules/dashboard/RecentActivity.tsx`
- Modify: `app/(authenticated)/dashboard/page.tsx`

**Interfaces:**

- Consumes: `overview.cashFlow`, `overview.budgetPressure`, `overview.accountsDebt`, `overview.recentActivity`, and `overview.currency`.
- Produces: an accessible six-month cash-flow figure, top-three budget pressure, account/debt evidence, and latest unified activity with explicit transaction types.

- [ ] **Step 1: Build the accessible cash-flow chart**

Create `CashFlowTrend.tsx` as the only lower-area client component:

```tsx
'use client';

import Link from 'next/link';
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function CashFlowTrend({
	cashFlow,
	currency,
}: {
	cashFlow: DashboardOverview['cashFlow'];
	currency: string;
}) {
	if (!cashFlow.hasActivity) {
		return (
			<section className='border p-5 sm:p-6' aria-labelledby='cash-flow-title'>
				<h2 id='cash-flow-title' className='text-lg font-semibold'>
					Six-month cash flow
				</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					Income and expense trends appear after the first transaction.
				</p>
				<Button asChild variant='outline' size='sm' className='mt-5'>
					<Link href='/transactions'>Open Transactions</Link>
				</Button>
			</section>
		);
	}

	const summary =
		'Across six months, income was ' +
		formatCurrency(cashFlow.totalIncome, { currency }) +
		', expenses were ' +
		formatCurrency(cashFlow.totalExpense, { currency }) +
		', and net cash flow was ' +
		formatCurrency(cashFlow.net, { currency }) +
		'.';

	return (
		<figure className='border p-5 sm:p-6' aria-labelledby='cash-flow-title'>
			<figcaption className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<h2 id='cash-flow-title' className='text-lg font-semibold'>
						Six-month cash flow
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>{summary}</p>
				</div>
				<p
					className={
						'font-mono text-sm font-semibold tabular-nums ' +
						(cashFlow.net >= 0
							? 'text-emerald-700 dark:text-emerald-300'
							: 'text-red-700 dark:text-red-300')
					}
				>
					{cashFlow.net >= 0 ? 'Surplus ' : 'Deficit '}
					{formatCurrency(Math.abs(cashFlow.net), { currency })}
				</p>
			</figcaption>
			<div className='mt-6 h-72' aria-hidden='true'>
				<ResponsiveContainer width='100%' height='100%'>
					<LineChart data={cashFlow.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
						<CartesianGrid vertical={false} stroke='currentColor' className='text-border' />
						<XAxis dataKey='month' tickLine={false} axisLine={false} />
						<YAxis
							width={72}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) =>
								formatCurrency(Number(value), {
									currency,
									decimals: 0,
								})
							}
						/>
						<Tooltip
							formatter={(value, name) => [
								formatCurrency(Number(value), { currency }),
								name === 'income' ? 'Income' : 'Expense',
							]}
						/>
						<Line type='monotone' dataKey='income' stroke='var(--chart-2)' strokeWidth={2} dot={false} />
						<Line type='monotone' dataKey='expense' stroke='var(--destructive)' strokeWidth={2} dot={false} />
					</LineChart>
				</ResponsiveContainer>
			</div>
			<table className='sr-only'>
				<caption>{summary}</caption>
				<thead>
					<tr><th>Month</th><th>Income</th><th>Expense</th><th>Surplus</th></tr>
				</thead>
				<tbody>
					{cashFlow.points.map((point) => (
						<tr key={point.month}>
							<th>{point.month}</th>
							<td>{formatCurrency(point.income, { currency })}</td>
							<td>{formatCurrency(point.expense, { currency })}</td>
							<td>{formatCurrency(point.surplus, { currency })}</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
}
```

- [ ] **Step 2: Build budget pressure and accounts/debt summaries**

Create `BudgetPressure.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function BudgetPressure({
	data,
	currency,
}: {
	data: DashboardOverview['budgetPressure'];
	currency: string;
}) {
	if (!data.hasBudgets) {
		return (
			<section className='border p-5 sm:p-6' aria-labelledby='budget-pressure-title'>
				<h2 id='budget-pressure-title' className='text-lg font-semibold'>
					Budget pressure
				</h2>
				<p className='mt-2 text-sm text-muted-foreground'>
					No current-month budgets exist yet.
				</p>
				<Button asChild variant='outline' size='sm' className='mt-5'>
					<Link href='/budgets'>Create a budget</Link>
				</Button>
			</section>
		);
	}

	return (
		<section className='border p-5 sm:p-6' aria-labelledby='budget-pressure-title'>
			<div className='flex items-end justify-between gap-4'>
				<div>
					<h2 id='budget-pressure-title' className='text-lg font-semibold'>
						Budget pressure
					</h2>
					<p className='mt-1 text-sm text-muted-foreground'>
						{formatCurrency(data.totalSpent, { currency })} of{' '}
						{formatCurrency(data.totalBudgeted, { currency })} used
					</p>
				</div>
				<span className='font-mono text-xl font-semibold tabular-nums'>
					{Math.round(data.utilizationPercent ?? 0)}%
				</span>
			</div>
			<ul className='mt-6 divide-y'>
				{data.items.map((budget) => (
					<li key={budget.id} className='py-4 first:pt-0 last:pb-0'>
						<div className='flex items-center justify-between gap-4 text-sm'>
							<span className='font-medium'>{budget.name}</span>
							<span className='font-mono tabular-nums text-muted-foreground'>
								{Math.round(budget.percentage)}%
							</span>
						</div>
						<div
							className='mt-2 h-1.5 overflow-hidden rounded-full bg-muted'
							role='progressbar'
							aria-label={budget.name + ' budget used'}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(Math.min(100, budget.percentage))}
						>
							<div
								className={
									'h-full rounded-full ' +
									(budget.percentage > 100
										? 'bg-red-500'
										: budget.percentage >= 80
											? 'bg-amber-500'
											: 'bg-emerald-500')
								}
								style={{ width: Math.min(100, budget.percentage) + '%' }}
							/>
						</div>
					</li>
				))}
			</ul>
			<Button asChild variant='ghost' size='sm' className='mt-5 px-0'>
				<Link href='/budgets'>Open Budgets</Link>
			</Button>
		</section>
	);
}
```

Create `AccountsDebtSummary.tsx`:

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

export function AccountsDebtSummary({
	data,
	currency,
}: {
	data: DashboardOverview['accountsDebt'];
	currency: string;
}) {
	const rows = [
		{ label: 'Liquid assets', value: formatCurrency(data.liquidAssets, { currency }) },
		{ label: 'Liabilities', value: formatCurrency(data.liabilities, { currency }) },
		{ label: 'Net worth', value: formatCurrency(data.netWorth, { currency }) },
		{
			label: 'Credit utilization',
			value:
				data.creditUtilization === null
					? 'No credit accounts'
					: data.creditUtilization.toFixed(1) + '%',
		},
	];

	return (
		<section className='border p-5 sm:p-6' aria-labelledby='accounts-debt-title'>
			<h2 id='accounts-debt-title' className='text-lg font-semibold'>
				Accounts and debt
			</h2>
			<dl className='mt-5 divide-y'>
				{rows.map((row) => (
					<div key={row.label} className='flex items-center justify-between gap-4 py-3 first:pt-0'>
						<dt className='text-sm text-muted-foreground'>{row.label}</dt>
						<dd className='font-mono text-sm font-semibold tabular-nums'>{row.value}</dd>
					</div>
				))}
			</dl>
			<Button asChild variant='ghost' size='sm' className='mt-3 px-0'>
				<Link href='/accounts'>Open Accounts</Link>
			</Button>
		</section>
	);
}
```

- [ ] **Step 3: Build the unified recent-activity list**

Create `RecentActivity.tsx`:

```tsx
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowLeftRight, ArrowUp, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { DashboardOverview } from '@/server/modules/dashboard/dashboard.types';

const META = {
	income: { label: 'Income', icon: ArrowUp },
	expense: { label: 'Expense', icon: ArrowDown },
	transfer: { label: 'Transfer', icon: ArrowLeftRight },
	payment: { label: 'Payment', icon: CreditCard },
};

export function RecentActivity({
	items,
	currency,
}: {
	items: DashboardOverview['recentActivity'];
	currency: string;
}) {
	return (
		<section className='border p-5 sm:p-6' aria-labelledby='recent-activity-title'>
			<div className='flex items-center justify-between gap-4'>
				<h2 id='recent-activity-title' className='text-lg font-semibold'>
					Recent activity
				</h2>
				<Button asChild variant='ghost' size='sm'>
					<Link href='/transactions'>View all</Link>
				</Button>
			</div>
			{items.length === 0 ? (
				<p className='mt-5 text-sm text-muted-foreground'>
					Income, expenses, transfers, and debt payments will appear here.
				</p>
			) : (
				<ul className='mt-4 divide-y'>
					{items.map((item) => {
						const meta = META[item.kind];
						const Icon = meta.icon;
						return (
							<li key={item.kind + '-' + item.id} className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3'>
								<Icon className='size-4 text-muted-foreground' aria-hidden='true' />
								<div className='min-w-0'>
									<div className='flex items-center gap-2'>
										<p className='truncate text-sm font-medium'>{item.title}</p>
										<span className='text-xs text-muted-foreground'>{meta.label}</span>
									</div>
									<p className='truncate text-xs text-muted-foreground'>
										{item.context} · {format(parseISO(item.date), 'MMM d')}
									</p>
								</div>
								<span
									className={
										'font-mono text-sm font-semibold tabular-nums ' +
										(item.direction === 'in'
											? 'text-emerald-700 dark:text-emerald-300'
											: item.direction === 'out'
												? 'text-red-700 dark:text-red-300'
												: 'text-foreground')
									}
								>
									{item.direction === 'in' ? '+' : item.direction === 'out' ? '−' : ''}
									{formatCurrency(item.amount, { currency })}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
```

- [ ] **Step 4: Integrate lower panels in evidence priority order**

Import the four components in `dashboard/page.tsx`. Immediately after `DashboardEvidenceStrip`, add:

```tsx
<div className='grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]'>
	<CashFlowTrend cashFlow={overview.cashFlow} currency={overview.currency} />
	<BudgetPressure data={overview.budgetPressure} currency={overview.currency} />
</div>
<div className='grid gap-6 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.65fr)]'>
	<AccountsDebtSummary data={overview.accountsDebt} currency={overview.currency} />
	<RecentActivity items={overview.recentActivity} currency={overview.currency} />
</div>
```

Keep these inside the non-empty branch. On mobile they must stack in this order: cash flow, budget pressure, accounts/debt, recent activity.

- [ ] **Step 5: Verify the complete composition**

Run:

```bash
docker compose exec app npm run test -- server/modules/dashboard/dashboard.presenter.test.ts
docker compose exec app npm run lint -- 'app/(authenticated)/dashboard/page.tsx' components/modules/dashboard/CashFlowTrend.tsx components/modules/dashboard/BudgetPressure.tsx components/modules/dashboard/AccountsDebtSummary.tsx components/modules/dashboard/RecentActivity.tsx
docker compose exec app npm run build
```

Expected: presenter regression tests PASS, lint is clean, and the build succeeds.

- [ ] **Step 6: Commit and push Task 5**

```bash
git add 'app/(authenticated)/dashboard/page.tsx' components/modules/dashboard/CashFlowTrend.tsx components/modules/dashboard/BudgetPressure.tsx components/modules/dashboard/AccountsDebtSummary.tsx components/modules/dashboard/RecentActivity.tsx
git commit -m "feat: add dashboard operating evidence"
git push origin main
```

---

### Task 6: Match loading geometry and retire the discarded dashboard

**Files:**

- Modify: `components/modules/dashboard/DashboardSkeleton.tsx:1-263`
- Create: `app/(authenticated)/dashboard/loading.tsx`
- Delete: the nine obsolete dashboard files listed in the File Map.

**Interfaces:**

- Consumes: the final dashboard section order from Tasks 4 and 5.
- Produces: `DashboardSkeleton()` and proof that no deleted dashboard component remains imported.

- [ ] **Step 1: Replace animated widget skeletons with static ledger geometry**

Replace `DashboardSkeleton.tsx` with:

```tsx
function Block({ className }: { className: string }) {
	return <div className={'rounded-md bg-muted/60 ' + className} />;
}

export function DashboardSkeleton() {
	return (
		<div className='container mx-auto space-y-8 py-6 md:py-10' aria-hidden='true'>
			<div className='flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
				<div className='space-y-2'>
					<Block className='h-10 w-52' />
					<Block className='h-4 w-44' />
				</div>
				<div className='grid grid-cols-2 gap-2 sm:flex'>
					{Array.from({ length: 4 }).map((_, index) => (
						<Block key={index} className='h-9 w-28' />
					))}
				</div>
			</div>
			<div className='grid gap-6 border-y bg-muted/20 py-7 sm:px-6 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(16rem,0.7fr)]'>
				<Block className='h-20 w-28' />
				<Block className='h-24 w-full' />
				<Block className='h-24 w-full' />
			</div>
			<div className='space-y-3'>
				<Block className='h-7 w-40' />
				{Array.from({ length: 5 }).map((_, index) => (
					<div key={index} className='grid gap-4 border-b py-5 md:grid-cols-[minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)_auto]'>
						<Block className='h-12 w-full' />
						<Block className='h-7 w-20' />
						<Block className='h-5 w-full' />
						<Block className='h-8 w-24' />
					</div>
				))}
			</div>
			<div className='grid border-y sm:grid-cols-2 lg:grid-cols-4'>
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className='space-y-2 py-4 sm:px-5'>
						<Block className='h-3 w-24' />
						<Block className='h-7 w-32' />
					</div>
				))}
			</div>
			<div className='grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]'>
				<Block className='h-80 w-full' />
				<Block className='h-80 w-full' />
			</div>
		</div>
	);
}
```

Do not use the shadcn `Skeleton` primitive here because its perpetual pulse conflicts with the no-looping-motion requirement.

- [ ] **Step 2: Add route-specific loading**

Create `app/(authenticated)/dashboard/loading.tsx`:

```tsx
import { DashboardSkeleton } from '@/components/modules/dashboard/DashboardSkeleton';

export default function DashboardLoading() {
	return <DashboardSkeleton />;
}
```

- [ ] **Step 3: Prove obsolete files have no consumers**

Run:

```bash
rg -n "@/components/modules/dashboard/(AccountCard|AccountCardCarousel|AiAdvisorTeaser|AnimatedNumber|DashboardTabs|GreetingHeader|IncomeExpenseTrend|QuickTransferPayment|RecentTransactions)" app components server lib
```

Expected: no matches. If any match appears outside a file being deleted, stop and update that consumer before deletion.

- [ ] **Step 4: Delete only the proven-unused files**

Delete exactly:

```text
components/modules/dashboard/AccountCard.tsx
components/modules/dashboard/AccountCardCarousel.tsx
components/modules/dashboard/AiAdvisorTeaser.tsx
components/modules/dashboard/AnimatedNumber.tsx
components/modules/dashboard/DashboardTabs.tsx
components/modules/dashboard/GreetingHeader.tsx
components/modules/dashboard/IncomeExpenseTrend.tsx
components/modules/dashboard/QuickTransferPayment.tsx
components/modules/dashboard/RecentTransactions.tsx
```

Use the patch tool for the deletions. Do not delete `QuickActionSheet.tsx` or any shared shadcn component.

- [ ] **Step 5: Run the focused regression and build**

Run:

```bash
docker compose exec app npm run test -- lib/financial-health-copy.test.ts server/modules/dashboard/dashboard.presenter.test.ts server/modules/dashboard/dashboard.controller.test.ts
docker compose exec app npm run lint -- 'app/(authenticated)/dashboard' components/modules/dashboard server/modules/dashboard lib/financial-health-copy.ts lib/financial-health-copy.test.ts
docker compose exec app npm run build
```

Expected: focused tests PASS, lint is clean, and the route-specific loading file builds.

- [ ] **Step 6: Commit and push Task 6**

Stage the loading files and the exact deletions only:

```bash
git add 'app/(authenticated)/dashboard/loading.tsx' components/modules/dashboard/DashboardSkeleton.tsx components/modules/dashboard/AccountCard.tsx components/modules/dashboard/AccountCardCarousel.tsx components/modules/dashboard/AiAdvisorTeaser.tsx components/modules/dashboard/AnimatedNumber.tsx components/modules/dashboard/DashboardTabs.tsx components/modules/dashboard/GreetingHeader.tsx components/modules/dashboard/IncomeExpenseTrend.tsx components/modules/dashboard/QuickTransferPayment.tsx components/modules/dashboard/RecentTransactions.tsx
git commit -m "refactor: retire legacy dashboard widgets"
git push origin main
```

---

### Task 7: Verify behavior, finish the visual system, and ship

**Files:**

- Verify: every file created or modified in Tasks 1-6.
- Create during review: `.impeccable/review/desktop-light.png`, `desktop-dark.png`, `tablet-light.png`, `tablet-dark.png`, `mobile-light.png`, `mobile-dark.png`.
- Modify after reviewer disposition: only files named by material review findings.
- Modify after the final correction: `DESIGN.md` and `.impeccable/design.json`.

**Interfaces:**

- Consumes: the complete implementation, approved comp, direction contract, Impeccable quality card, detector output, and six valid screenshots.
- Produces: verified Docker output, one finish-review disposition, a recorded design system, one final commit, and a normal push to `origin/main`.

- [ ] **Step 1: Run the full automated verification from a clean command start**

Invoke the `superpowers:verification-before-completion` skill, then run:

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
```

Expected: every Vitest test passes, ESLint exits zero, and Next.js completes a production build.

- [ ] **Step 2: Run architectural and removal checks**

Run:

```bash
rg -n "@/server/modules/(dashboard|budget|category|transaction|user|goal|invoice)/.*service" 'app/(authenticated)/dashboard/page.tsx'
rg -n "animate-fade-up|AccountCardCarousel|AiAdvisorTeaser|AnimatedNumber|DashboardTabs|QuickTransferPayment" 'app/(authenticated)/dashboard' components/modules/dashboard
rg -n "historical|score delta|This month.*Select|AI Advisor" 'app/(authenticated)/dashboard' components/modules/dashboard
```

Expected: all three searches return no matches. `ScoreRing` may remain in Reports because Reports is outside the visual-removal scope.

- [ ] **Step 3: Exercise real dashboard controls**

With Docker running at `http://localhost:3000` and a populated generic test account:

1. Open `/dashboard` and confirm only one application sidebar/header exists.
2. Open and close Add income, Add expense, Transfer, and Pay debt. Confirm each sheet title and form appears; do not submit test mutations.
3. Follow each ledger route action and use browser Back to return.
4. Keyboard-tab through quick actions, verdict action, every ledger action, and lower-panel links; confirm visible focus.
5. Zoom to 200% and confirm no value or action is clipped.
6. Confirm the mobile layout has no horizontal page scroll and keeps the lower-section priority order.
7. Confirm status is always represented by text/grade/sign in addition to color.

- [ ] **Step 4: Capture one bounded visual-review round**

Using the Browser skill, settle loading and capture from the document top:

| File | Viewport | Theme |
| --- | ---: | --- |
| `.impeccable/review/desktop-light.png` | 1536×1024 | light |
| `.impeccable/review/desktop-dark.png` | 1536×1024 | dark |
| `.impeccable/review/tablet-light.png` | 1024×900 | light |
| `.impeccable/review/tablet-dark.png` | 1024×900 | dark |
| `.impeccable/review/mobile-light.png` | 390×844 | light |
| `.impeccable/review/mobile-dark.png` | 390×844 | dark |

Open every capture once and reject black, blank, half-loaded, wrong-route, or motion-timed frames. Compare desktop crops of the header, verdict, ledger, evidence strip, and lower panels beside the same regions in `.impeccable/mocks/decision/health-ledger.png`. Batch all self-found material fixes once, rebuild once, and take at most one confirmation round.

- [ ] **Step 5: Run the Impeccable detector exactly once**

Run after the screenshot batch:

```bash
node /home/blank/.codex/skills/impeccable/scripts/detect.mjs --json 'app/(authenticated)/dashboard/page.tsx' 'app/(authenticated)/dashboard/loading.tsx' components/modules/dashboard/DashboardActionButton.tsx components/modules/dashboard/DashboardHeader.tsx components/modules/dashboard/DashboardStatePanels.tsx components/modules/dashboard/FinancialHealthVerdict.tsx components/modules/dashboard/HealthLedger.tsx components/modules/dashboard/DashboardEvidenceStrip.tsx components/modules/dashboard/CashFlowTrend.tsx components/modules/dashboard/BudgetPressure.tsx components/modules/dashboard/AccountsDebtSummary.tsx components/modules/dashboard/RecentActivity.tsx components/modules/dashboard/DashboardSkeleton.tsx
```

Fix mechanical findings in one batch and pass unresolved findings to the reviewer. Do not run a second detector. No asset-provenance scan is required because the shipping dashboard adds no raster.

- [ ] **Step 6: Dispatch the mandatory fresh finish reviewer**

The Impeccable skill explicitly requires this separate review. Spawn `impeccable_finish_reviewer` with `fork_turns: "none"` and provide:

- the user request: a full minimalist dashboard redesign that communicates financial health at a glance, preserves useful quick actions, removes excessive animation/useless widgets, and uses Reports’ aggressive diagnosis tone;
- artifact URL `http://localhost:3000/dashboard` and the full changed-file list;
- all six screenshot paths plus `.impeccable/review/hero-repro.png`;
- the direction contract in `docs/superpowers/specs/2026-08-16-dashboard-health-ledger-design.md#2-approved-direction`;
- `.impeccable/mocks/decision/health-ledger.png` as the approved comp;
- the exact QUALITY BAR card emitted by the Task 4 Impeccable context command;
- the detector’s complete findings;
- craft-floor reference `/home/blank/.codex/skills/impeccable/reference/craft-floor.md`;
- the state rule that empty/partial diagnoses are covered by presenter tests and must remain non-aggressive.

Wait once with a long timeout. Require the reviewer’s five contract sections and obey its exact disposition:

- `recapture`: replace invalid evidence and request a fresh full review.
- `rebuild`: replace the named regions wholesale, recapture all required views, and request a fresh full review.
- `fix`: apply one material fix batch, rebuild, recapture the same views, and send them back to the same reviewer for a verdict pass.
- `ship`: make no further visual changes.

Do not self-certify a `fix` or `rebuild` result.

- [ ] **Step 7: Record the finished dashboard system**

After the final reviewer correction, spawn `impeccable_documenter` fresh. Provide:

- project root;
- artifact `app/(authenticated)/dashboard/page.tsx`;
- the final direction contract;
- `PRODUCT.md`;
- `/home/blank/.codex/skills/impeccable/reference/document.md`;
- boundary: merge the Health Ledger’s neutral hairline, fixed-comparison-row, semantic-status, static-motion, and evidence-panel rules into the existing authenticated-app design system; preserve unrelated landing, Reports, and global component guidance.

The documenter must update `DESIGN.md` and regenerate `.impeccable/design.json` together. Review the diff to ensure it records shipped code rather than the mock’s unsupported delta, synthetic values, or period dropdown.

- [ ] **Step 8: Re-run verification after all review/documentation changes**

Run:

```bash
docker compose exec app npm run test
docker compose exec app npm run lint
docker compose exec app npm run build
git status --short
```

Expected: all commands pass. `git status` shows only this task’s review images/design documents plus the pre-existing user-owned changes called out in Global Constraints.

- [ ] **Step 9: Commit and push the finished dashboard**

Stage the exact implementation/review/documentation paths; do not use `git add .`:

```bash
git add 'app/(authenticated)/dashboard' components/modules/dashboard lib/financial-health-copy.ts lib/financial-health-copy.test.ts server/modules/dashboard components/modules/reports/FinancialHealthCheck.tsx DESIGN.md .impeccable/design.json .impeccable/review
git commit -m "feat: ship health ledger dashboard"
git push origin main
```

If there is nothing new to commit because reviewer evidence was committed earlier and the documenter made no change, do not create an empty commit. Confirm `git rev-parse HEAD` equals `git rev-parse origin/main`.

- [ ] **Step 10: Report only evidence-backed completion**

Report:

- the Health Ledger outcome and retained quick actions;
- the exact automated verification commands and passing results;
- the finish reviewer’s disposition at its actual scope;
- the commit hash pushed to `main`;
- any intentional, narrow unresolved reviewer item without softening it.

Do not claim success from an earlier test run after later edits.
