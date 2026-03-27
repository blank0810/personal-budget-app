import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';

interface InvoiceDashboardWidgetProps {
	outstanding: number;
	overdueCount: number;
	draftCount: number;
	currency: string;
}

export function InvoiceDashboardWidget({
	outstanding,
	overdueCount,
	draftCount,
	currency,
}: InvoiceDashboardWidgetProps) {
	const fmt = (value: number) => formatCurrency(value, { currency });

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between pb-3'>
				<CardTitle className='flex items-center gap-2'>
					<FileText className='h-5 w-5 text-primary' />
					Invoices
				</CardTitle>
				<Link href='/invoices' className='text-xs text-primary hover:underline'>
					View all →
				</Link>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* 3-metric row */}
				<div className='grid grid-cols-3 gap-3'>
					<div className='space-y-0.5'>
						<p className='text-xs text-muted-foreground'>Outstanding</p>
						<p className='text-lg font-bold tabular-nums'>
							{fmt(outstanding)}
						</p>
					</div>
					<div className='space-y-0.5'>
						<p className='text-xs text-muted-foreground'>Overdue</p>
						<p
							className={`text-lg font-bold tabular-nums ${
								overdueCount > 0
									? 'text-red-600 dark:text-red-400'
									: ''
							}`}
						>
							{overdueCount}
						</p>
					</div>
					<div className='space-y-0.5'>
						<p className='text-xs text-muted-foreground'>Drafts</p>
						<p className='text-lg font-bold tabular-nums'>{draftCount}</p>
					</div>
				</div>

				{/* Overdue alert */}
				{overdueCount > 0 && (
					<div className='flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300'>
						<AlertTriangle className='h-3.5 w-3.5 shrink-0' />
						<span>
							{overdueCount === 1
								? '1 invoice is past due'
								: `${overdueCount} invoices are past due`}
						</span>
					</div>
				)}

				{/* Quick actions */}
				<div className='flex gap-2'>
					<Button asChild size='sm' className='flex-1'>
						<Link href='/invoices/new'>
							<Plus className='h-3.5 w-3.5 mr-1.5' />
							New Invoice
						</Link>
					</Button>
					<Button asChild size='sm' variant='outline' className='flex-1'>
						<Link href='/invoices'>View All</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
