'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/lib/contexts/currency-context';
import { DollarSign, FileEdit, AlertTriangle, CheckCircle } from 'lucide-react';

export type InvoiceSummaryData = Record<string, { count: number; totalAmount: number }>;

interface InvoiceSummaryCardsProps {
	summary: InvoiceSummaryData;
}

export function InvoiceSummaryCards({ summary }: InvoiceSummaryCardsProps) {
	const { formatCurrency } = useCurrency();

	const sentAmount = (summary['SENT']?.totalAmount ?? 0) + (summary['OVERDUE']?.totalAmount ?? 0);
	const draftsCount = summary['DRAFT']?.count ?? 0;
	const overdueCount = summary['OVERDUE']?.count ?? 0;
	const paidAmount = summary['PAID']?.totalAmount ?? 0;

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
					<p className='text-2xl font-bold'>{formatCurrency(sentAmount)}</p>
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
					<p className='text-2xl font-bold'>{draftsCount}</p>
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
					<p className='text-2xl font-bold'>{formatCurrency(paidAmount)}</p>
					<p className='text-xs text-muted-foreground mt-1'>All time</p>
				</CardContent>
			</Card>
		</div>
	);
}
