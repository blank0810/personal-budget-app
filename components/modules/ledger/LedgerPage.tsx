'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerKPICards } from './LedgerKPICards';
import { LedgerDiscrepancyBanner } from './LedgerDiscrepancyBanner';
import { LedgerFilters } from './LedgerFilters';
import { LedgerTable } from './LedgerTable';
import {
	getLedgerPageAction,
	getLedgerKpiAction,
} from '@/server/modules/ledger/ledger.controller';
import type { LedgerPage as LedgerPageData, LedgerKpiSnapshot } from '@/server/modules/ledger/ledger.types';

interface LedgerPageProps {
	initialPage: LedgerPageData | null;
	initialKpi: LedgerKpiSnapshot | null;
	accounts: Array<{ id: string; name: string }>;
}

export function LedgerPage({
	initialPage,
	initialKpi,
	accounts,
}: LedgerPageProps) {
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [ledgerPage, setLedgerPage] = useState<LedgerPageData | null>(initialPage);
	const [kpi, setKpi] = useState<LedgerKpiSnapshot | null>(initialKpi);

	// Sync when server re-renders with fresh data (e.g. after router.refresh())
	useEffect(() => {
		setLedgerPage(initialPage);
		setKpi(initialKpi);
	}, [initialPage, initialKpi]);

	const buildFilter = useCallback(() => {
		// accountId may appear multiple times in the URL
		const accountIds = searchParams.getAll('accountId');

		return {
			type: searchParams.get('type') ?? undefined,
			accountIds: accountIds.length > 0 ? accountIds : undefined,
			startDate: searchParams.get('from') ?? undefined,
			endDate: searchParams.get('to') ?? undefined,
			page: Number(searchParams.get('page') ?? '1'),
			pageSize: Number(searchParams.get('pageSize') ?? '25'),
		};
	}, [searchParams]);

	const fetchData = useCallback(() => {
		const filter = buildFilter();

		startTransition(async () => {
			const [pageResult, kpiResult] = await Promise.all([
				getLedgerPageAction(filter),
				getLedgerKpiAction(filter),
			]);

			if ('data' in pageResult && pageResult.data) {
				setLedgerPage(pageResult.data);
			}
			if ('data' in kpiResult && kpiResult.data) {
				setKpi(kpiResult.data);
			}
		});
	}, [buildFilter]);

	// Re-fetch when URL params change (skip initial render — server already fetched)
	const [isInitial, setIsInitial] = useState(true);
	useEffect(() => {
		if (isInitial) {
			setIsInitial(false);
			return;
		}
		fetchData();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	const discrepancy = ledgerPage?.discrepancy ?? null;

	return (
		<div className='space-y-6'>
			{/* Discrepancy banner — only when tripwire fires */}
			{discrepancy && <LedgerDiscrepancyBanner discrepancy={discrepancy} />}

			{/* KPI cards */}
			{kpi && <LedgerKPICards kpi={kpi} />}

			{/* Ledger table card */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-lg'>Ledger</CardTitle>
					<p className='text-sm text-muted-foreground'>
						Chronological record of all transactions with running totals
					</p>
				</CardHeader>
				<CardContent className={isPending ? 'opacity-60 transition-opacity' : ''}>
					<LedgerFilters accounts={accounts} />
					<div className='mt-4'>
						{ledgerPage ? (
							<LedgerTable ledgerPage={ledgerPage} />
						) : (
							<div className='flex flex-col items-center justify-center py-16 text-center'>
								<p className='text-sm text-muted-foreground'>
									Failed to load ledger data.
								</p>
								<p className='mt-1 text-xs text-muted-foreground'>
									Please refresh the page.
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
