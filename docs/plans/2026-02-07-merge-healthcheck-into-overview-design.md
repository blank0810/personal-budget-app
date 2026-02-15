# Overview Tab UX Refinement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the merged Overview tab layout for better visual balance, reduced information density, and guided interactivity.

**Architecture:** Three changes to the Overview tab: (1) replace the Score Ring Card with an inline health badge that sits alongside 4 KPI cards in a single row, (2) make the Net Worth chart collapsible with a toggle, (3) auto-expand the weakest pillar with a nudge message. All CSS-only, no new dependencies except shadcn Collapsible.

**Tech Stack:** React 19, Tailwind CSS 4, shadcn/ui (Collapsible), Recharts

---

## Context: What Was Already Done

The initial Health Check merge is complete on branch `v1.8`:
- Health Check tab removed (5 tabs -> 4)
- `fundHealth` data fetching removed from reports page
- `FinancialHealthCheck` component refactored with `variant` prop (`score-only`, `pillars-only`, `full`)
- Pillar one-liners added
- Score Ring mount animation fixed
- Staggered pillar fade-in and progress bar animations added

This plan addresses the UX refinements identified during brainstorming review.

## Current State (what we're changing FROM)

```
Row 1: [ScoreRing Card (1/5)] [KPI][KPI][KPI][KPI] (4/5)  <- 5 cards, height mismatch
Row 2: [Net Worth Chart - 350px, no collapse]               <- always visible, no user control
Row 3: [Pillar Breakdown - all collapsed]                    <- no guidance on where to look
```

## Target State (what we're changing TO)

```
Row 1: [Badge: 72 Fair "roast..."] [KPI][KPI][KPI][KPI]    <- inline badge, 4 cards, balanced
Row 2: [Net Worth Chart - 350px, collapsible ▾]             <- user can collapse after reading
Row 3: [Pillar Breakdown - weakest auto-expanded]           <- guided experience
         ⚡ "Your weakest area — expand for tips"
```

---

### Task 1: Install shadcn Collapsible primitive

**Files:**
- Create: `components/ui/collapsible.tsx` (via shadcn CLI)

**Step 1: Install the component**

Run: `docker compose exec app npx shadcn@latest add collapsible`

Expected: New file at `components/ui/collapsible.tsx` with `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` exports.

**Step 2: Verify the file exists**

Run: `ls components/ui/collapsible.tsx`

Expected: File exists.

**Step 3: Commit**

```bash
git add components/ui/collapsible.tsx
git commit -m "chore: add shadcn Collapsible primitive"
```

---

### Task 2: Replace ScoreOnlyCard with inline HealthBadge

**Files:**
- Modify: `components/modules/reports/FinancialHealthCheck.tsx` (lines 34-36 props, lines 152-172 ScoreOnlyCard, lines 409-421 main export)
- Modify: `app/(authenticated)/reports/page.tsx` (lines 129-169 Overview tab Row 1)

**Step 1: Add `badge` variant to FinancialHealthCheck**

In `components/modules/reports/FinancialHealthCheck.tsx`:

1a. Update the `variant` type in `FinancialHealthCheckProps` (line 36):

```tsx
interface FinancialHealthCheckProps {
	data: FinancialHealthScoreData;
	variant?: 'full' | 'score-only' | 'pillars-only' | 'badge';
}
```

1b. Replace the `ScoreOnlyCard` function (lines 152-172) with a new `HealthBadge` component. This is an inline element — no Card wrapper. Horizontal layout: ring (smaller, 80px) + label + one-line roast. Must match KPI card height naturally.

```tsx
function HealthBadge({ data }: { data: FinancialHealthScoreData }) {
	const colors = getScoreColor(data.overallScore);

	return (
		<Card className='h-full'>
			<CardContent className='flex items-center gap-4 p-4 h-full'>
				<ScoreRing score={data.overallScore} size={80} />
				<div className='min-w-0'>
					<p className={cn('text-lg font-bold leading-tight', colors.text)}>
						{data.overallLabel}
					</p>
					<p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
						{getLabelDescription(data.overallLabel)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
```

Note: We keep a Card wrapper for visual consistency with the KPI cards in the row, but use a compact horizontal layout instead of the tall centered vertical layout.

1c. Update the main export (line 411-413) to handle the `badge` variant:

```tsx
export function FinancialHealthCheck({ data, variant = 'full' }: FinancialHealthCheckProps) {
	if (variant === 'badge') {
		return <HealthBadge data={data} />;
	}

	if (variant === 'score-only') {
		return <ScoreOnlyCard data={data} />;
	}

	if (variant === 'pillars-only') {
		return <PillarsOnlyCard data={data} />;
	}

	return <FullHealthCheck data={data} />;
}
```

**Step 2: Update reports page Overview tab Row 1**

In `app/(authenticated)/reports/page.tsx`, replace the current Row 1 grid (lines 131-169):

FROM:
```tsx
{/* Row 1: Score Ring + KPI Cards */}
<div className='grid gap-4 grid-cols-1 lg:grid-cols-5'>
    {/* Score Ring — hero position */}
    <div className='lg:col-span-1'>
        <FinancialHealthCheck data={healthScore} variant='score-only' />
    </div>
    {/* KPI Cards */}
    <div className='lg:col-span-4 grid gap-4 grid-cols-2 lg:grid-cols-4'>
        ...KPIs...
    </div>
</div>
```

TO:
```tsx
{/* Row 1: Health Badge + KPI Cards */}
<div className='grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5'>
    {/* Health Badge — inline anchor */}
    <FinancialHealthCheck data={healthScore} variant='badge' />
    {/* KPI Cards */}
    <KPICard title='Net Result' ... />
    <KPICard title='Inflow Velocity' ... />
    <KPICard title='Burn Rate' ... inverseTrend />
    <KPICard title='Savings Ratio' ... />
</div>
```

All 5 items (badge + 4 KPIs) are now direct grid children. On `lg`: 5 equal columns. On `md`: 2 columns (badge + first KPI, then 2+2). On mobile: stacked.

**Step 3: Verify lint passes**

Run: `docker compose exec app sh -c "npx tsc --noEmit"`

Expected: No new errors.

**Step 4: Commit**

```bash
git add components/modules/reports/FinancialHealthCheck.tsx app/\(authenticated\)/reports/page.tsx
git commit -m "refactor: replace score-only card with inline health badge in Overview"
```

---

### Task 3: Make NetWorthTrendChart collapsible

**Files:**
- Modify: `components/modules/reports/NetWorthTrendChart.tsx`

**Step 1: Add collapsible state to NetWorthTrendChart**

Replace the entire component. Add `useState` for collapsed state. Use the shadcn `Collapsible` primitive to wrap the chart content. Add a toggle button in the card header.

```tsx
'use client';

import { useState } from 'react';
import {
	Area,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	Line,
	ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { NetWorthHistoryPoint } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

interface NetWorthTrendChartProps {
	data: NetWorthHistoryPoint[];
}

export function NetWorthTrendChart({ data }: NetWorthTrendChartProps) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<Card>
				<CardHeader className='flex flex-row items-center justify-between space-y-0'>
					<CardTitle>Net Worth Trend</CardTitle>
					<CollapsibleTrigger asChild>
						<Button variant='ghost' size='sm'>
							<ChevronsUpDown className='h-4 w-4' />
							<span className='sr-only'>Toggle chart</span>
						</Button>
					</CollapsibleTrigger>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className='pl-2'>
						<ResponsiveContainer width='100%' height={350}>
							{/* ... existing ComposedChart unchanged ... */}
						</ResponsiveContainer>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}
```

Keep the entire `<ComposedChart>` internals (defs, axes, tooltip, legend, area, lines) exactly as-is. Only wrap it in Collapsible.

**Step 2: Verify lint passes**

Run: `docker compose exec app sh -c "npx tsc --noEmit"`

Expected: No new errors.

**Step 3: Commit**

```bash
git add components/modules/reports/NetWorthTrendChart.tsx
git commit -m "feat: add collapse toggle to Net Worth Trend chart"
```

---

### Task 4: Auto-expand weakest pillar with nudge text

**Files:**
- Modify: `components/modules/reports/FinancialHealthCheck.tsx` (PillarsOnlyCard function, lines 176-281)

**Step 1: Update PillarsOnlyCard initial state and add nudge**

In `PillarsOnlyCard`, make two changes:

4a. Initialize `expandedPillar` to the weakest pillar's name instead of `null`:

```tsx
function PillarsOnlyCard({ data }: { data: FinancialHealthScoreData }) {
	const topRecommendation = [...data.pillars]
		.filter((p) => p.grade !== 'A')
		.sort((a, b) => a.score - b.score)[0];

	const [expandedPillar, setExpandedPillar] = useState<string | null>(
		topRecommendation?.name ?? null
	);
	const [hasInteracted, setHasInteracted] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const id = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(id);
	}, []);
```

Note: `topRecommendation` must be computed before the `useState` call since hooks can't be called conditionally.

4b. Update the button `onClick` to set `hasInteracted`:

```tsx
onClick={() => {
    setExpandedPillar(isExpanded ? null : pillar.name);
    if (!hasInteracted) setHasInteracted(true);
}}
```

4c. Add nudge text below the weakest pillar row (inside the `.map()`, after the expandable detail `div`, still inside the outer `div[key]`). Only show when: it's the weakest pillar AND user hasn't interacted yet AND the pillar is expanded (auto-expanded):

```tsx
{/* Nudge for weakest pillar */}
{isWeakest && !hasInteracted && isExpanded && (
    <p className='text-xs text-muted-foreground px-3 pb-2 flex items-center gap-1.5'>
        <span className='text-yellow-500'>&#9889;</span>
        Your weakest area — expand for tips
    </p>
)}
```

Wait — if it's already auto-expanded, the nudge should say something more like "Your weakest area — see recommendation above" or we should place it differently. Actually, re-reading the brainstorm: the nudge makes more sense when the pillar is auto-expanded, telling the user WHY it's open. Let me adjust:

```tsx
{isWeakest && !hasInteracted && (
    <p className='text-xs text-muted-foreground px-3 pb-2 flex items-center gap-1.5'>
        <span className='text-yellow-500'>&#9889;</span>
        Your weakest area — check the recommendation above
    </p>
)}
```

This shows below the weakest pillar row regardless of expand state, and disappears after any interaction.

**Step 2: Verify lint passes**

Run: `docker compose exec app sh -c "npx tsc --noEmit"`

Expected: No new errors.

**Step 3: Commit**

```bash
git add components/modules/reports/FinancialHealthCheck.tsx
git commit -m "feat: auto-expand weakest pillar with nudge text in Overview"
```

---

### Task 5: Clean up unused code

**Files:**
- Modify: `components/modules/reports/FinancialHealthCheck.tsx`

**Step 1: Remove `ScoreOnlyCard` function**

The `ScoreOnlyCard` function (old vertical card layout) is no longer used — replaced by `HealthBadge`. Delete the entire function and remove the `'score-only'` branch from the main export.

Update the variant type:
```tsx
variant?: 'full' | 'pillars-only' | 'badge';
```

Update the main export:
```tsx
export function FinancialHealthCheck({ data, variant = 'full' }: FinancialHealthCheckProps) {
	if (variant === 'badge') {
		return <HealthBadge data={data} />;
	}

	if (variant === 'pillars-only') {
		return <PillarsOnlyCard data={data} />;
	}

	return <FullHealthCheck data={data} />;
}
```

**Step 2: Verify no remaining references to `score-only`**

Run: `grep -r "score-only" app/ components/`

Expected: No matches.

**Step 3: Verify lint passes**

Run: `docker compose exec app sh -c "npx tsc --noEmit"`

Expected: No new errors.

**Step 4: Commit**

```bash
git add components/modules/reports/FinancialHealthCheck.tsx
git commit -m "chore: remove unused ScoreOnlyCard variant"
```

---

### Task 6: Final verification

**Step 1: Run full lint + type check**

Run: `docker compose exec app sh -c "npx tsc --noEmit && npx eslint . --max-warnings 100"`

Expected: 0 errors from changed files. Pre-existing warnings only.

**Step 2: Visual check list**

Manually verify in browser at `/reports`:
- [ ] Overview tab shows: health badge + 4 KPI cards in one row
- [ ] Badge shows score ring (80px), label, and roast text horizontally
- [ ] Net Worth chart has collapse/expand toggle button
- [ ] Chart is expanded by default, collapses on click
- [ ] Weakest pillar is auto-expanded on load
- [ ] Nudge text appears below weakest pillar
- [ ] Nudge disappears after clicking any pillar
- [ ] All animations still work (ring, pillar fade-in, progress bars)
- [ ] Mobile layout stacks correctly (badge on top, KPIs 2x2, chart, pillars)

---

## Files Summary

| File | Change |
|------|--------|
| `components/ui/collapsible.tsx` | NEW — shadcn Collapsible primitive |
| `components/modules/reports/FinancialHealthCheck.tsx` | Add `badge` variant, remove `score-only`, auto-expand weakest pillar, nudge text |
| `components/modules/reports/NetWorthTrendChart.tsx` | Wrap chart in Collapsible with toggle button |
| `app/(authenticated)/reports/page.tsx` | Flatten Row 1 grid to 5 equal columns (badge + 4 KPIs) |

## Data Fetching

No changes. All data already fetched.
