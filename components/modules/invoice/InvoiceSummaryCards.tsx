'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, FileEdit, AlertTriangle, CheckCircle } from 'lucide-react';
import type { InvoiceSummary } from '@/server/modules/invoice/invoice.types';

interface InvoiceSummaryCardsProps {
	summary: InvoiceSummary;
}

/**
 * Render a per-currency breakdown of monetary amounts.
 * When there is only one currency, displays a single clean number.
 * When there are multiple currencies, shows each on its own line with a currency label.
 * Returns a dash when there are no amounts.
 */
function CurrencyBreakdown({ amounts }: { amounts: Record<string, number> }) {
	const entries = Object.entries(amounts).filter(([, v]) => v > 0);

	if (entries.length === 0) {
		return <span>{formatCurrency(0)}</span>;
	}

	if (entries.length === 1) {
		const [currency, value] = entries[0];
		return <span>{formatCurrency(value, { currency })}</span>;
	}

	return (
		<span className='flex flex-col gap-0.5'>
			{entries.map(([currency, value]) => (
				<span key={currency}>
					{formatCurrency(value, { currency })}
				</span>
			))}
		</span>
	);
}

export function InvoiceSummaryCards({ summary }: InvoiceSummaryCardsProps) {
	const { outstanding, paid, draftCount, overdueCount } = summary;

	const hasMultipleOutstanding = Object.keys(outstanding).filter(k => (outstanding[k] ?? 0) > 0).length > 1;
	const hasMultiplePaid = Object.keys(paid).filter(k => (paid[k] ?? 0) > 0).length > 1;

	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
			<Card>
				<CardHeader className='flex flex-row items-center justify-between pb-2'>
					<CardTitle className='text-sm font-medium text-muted-foreground'>
						Outstanding
					</CardTitle>
					<DollarSign className='h-4 w-4 text-muted-foreground' />
				</CardHeader>
				<CardContent>
					<div className={hasMultipleOutstanding ? 'text-xl font-bold' : 'text-2xl font-bold'}>
						<CurrencyBreakdown amounts={outstanding} />
					</div>
					<p className='text-xs text-muted-foreground mt-1'>Sent + overdue</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between pb-2'>
					<CardTitle className='text-sm font-medium text-muted-foreground'>
						Drafts
					</CardTitle>
					<FileEdit className='h-4 w-4 text-muted-foreground' />
				</CardHeader>
				<CardContent>
					<p className='text-2xl font-bold'>{draftCount}</p>
					<p className='text-xs text-muted-foreground mt-1'>Not yet sent</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between pb-2'>
					<CardTitle className='text-sm font-medium text-muted-foreground'>
						Overdue
					</CardTitle>
					<AlertTriangle className='h-4 w-4 text-muted-foreground' />
				</CardHeader>
				<CardContent>
					<p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : ''}`}>
						{overdueCount}
					</p>
					<p className='text-xs text-muted-foreground mt-1'>Past due date</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between pb-2'>
					<CardTitle className='text-sm font-medium text-muted-foreground'>
						Total Paid
					</CardTitle>
					<CheckCircle className='h-4 w-4 text-muted-foreground' />
				</CardHeader>
				<CardContent>
					<div className={hasMultiplePaid ? 'text-xl font-bold' : 'text-2xl font-bold'}>
						<CurrencyBreakdown amounts={paid} />
					</div>
					<p className='text-xs text-muted-foreground mt-1'>All time</p>
				</CardContent>
			</Card>
		</div>
	);
}
