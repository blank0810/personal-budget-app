import { z } from 'zod';

// ---------------------------------------------------------------------------
// Filter / pagination input — validated in the controller
// ---------------------------------------------------------------------------

export const ledgerFilterSchema = z.object({
	type: z.enum(['income', 'expense', 'transfer', 'payment']).optional(),
	accountIds: z.array(z.string()).optional(),
	categoryIds: z.array(z.string()).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(250).default(50),
});

export type LedgerFilterInput = z.infer<typeof ledgerFilterSchema>;

// ---------------------------------------------------------------------------
// Ledger row — discriminated by `kind`. Each row carries the per-row running
// totals computed at its chronological position in the FULL transaction trail
// (independent of filters — see design doc "Filter behaviour").
// ---------------------------------------------------------------------------

interface LedgerRowBase {
	id: string;
	date: string; // ISO string
	createdAt: string; // ISO string — secondary sort key
	description: string | null;
	accountId: string | null;
	accountName: string | null;
	accountIsArchived: boolean;
	// Raw amount the row carries (always positive). UI derives sign + color
	// from `kind` + the account's isLiability flag.
	amount: number;
	// Signed deltas this row contributes to the global aggregates. Used to
	// back-out a row's contribution when computing opening totals for a page.
	deltaAssets: number;
	deltaLiabilities: number;
	// Running totals at this row's chronological position (post-delta). They
	// reflect the user's ACTUAL state at that moment, not just the filtered
	// subset — see design doc "Filter behaviour".
	runningAssets: number;
	runningLiabilities: number;
	runningNetWorth: number;
}

export type LedgerRow =
	| (LedgerRowBase & {
			kind: 'income';
			categoryName: string;
			isLiabilityAccount: boolean;
	  })
	| (LedgerRowBase & {
			kind: 'expense';
			categoryName: string;
			isLiabilityAccount: boolean;
	  })
	| (LedgerRowBase & {
			kind: 'transfer';
			fromAccountName: string | null;
			toAccountName: string | null;
			fromAccountId: string | null;
			toAccountId: string | null;
			isPayment: boolean;
	  })
	| (LedgerRowBase & {
			kind: 'opening';
			accountId: string;
			accountName: string;
	  });

// ---------------------------------------------------------------------------
// KPI snapshot — three cards at the top of the page
// ---------------------------------------------------------------------------

export interface LedgerKpiSnapshot {
	totalAssets: number;
	totalLiabilities: number;
	netWorth: number;
	// Delta vs the OPENING totals for the current filter window. Lets users
	// see how the visible window moved net worth.
	deltaAssets: number;
	deltaLiabilities: number;
	deltaNetWorth: number;
}

// ---------------------------------------------------------------------------
// Page response
// ---------------------------------------------------------------------------

export interface LedgerPage {
	rows: LedgerRow[];
	total: number;
	page: number;
	pageSize: number;
	openingTotals: {
		assets: number;
		liabilities: number;
		netWorth: number;
	};
	// Tripwire — populated when running totals at the end of the user's full
	// history disagree with Σ(Account.balance). Surfaced as a banner in the UI.
	discrepancy: {
		assetsDiff: number;
		liabilitiesDiff: number;
	} | null;
}
