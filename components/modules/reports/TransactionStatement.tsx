'use client';

import { TransactionStatement as TransactionStatementType } from '@/server/modules/report/report.types';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { ArrowDownLeft, ArrowUpRight, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionStatementProps {
	data: TransactionStatementType;
	accountName: string;
	userName: string;
}

export function TransactionStatement({
	data,
	accountName,
	userName,
}: TransactionStatementProps) {
	const handleExportPDF = () => {
		// Encode statement data as base64 JSON
		const payload = {
			statement: data,
			accountName,
			userName,
		};
		const encodedData = btoa(JSON.stringify(payload));

		// Open print page in new tab
		window.open(`/reports/statement/print?data=${encodedData}`, '_blank');
	};

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-col md:flex-row justify-between md:items-center gap-4'>
					<div>
						<CardTitle className='flex items-center gap-2'>
							<FileText className='h-5 w-5' />
							Transaction Statement
						</CardTitle>
						<CardDescription>
							{format(new Date(data.periodStart), 'MMM d, yyyy')} -{' '}
							{format(new Date(data.periodEnd), 'MMM d, yyyy')}
						</CardDescription>
					</div>
					<div className='flex flex-wrap items-center gap-2'>
						<Button variant='outline' onClick={handleExportPDF}>
							<Download className='h-4 w-4 mr-2' />
							Export PDF
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className='space-y-6'>
					{/* Summary Cards */}
					<div className='grid gap-4 md:grid-cols-4'>
						<div className='p-4 rounded-lg bg-muted/50'>
							<p className='text-sm text-muted-foreground'>Opening Balance</p>
							<p className='text-xl font-bold'>
								{formatCurrency(data.openingBalance)}
							</p>
						</div>
						<div className='p-4 rounded-lg bg-green-50 dark:bg-green-950/20'>
							<p className='text-sm text-green-600'>Total Income</p>
							<p className='text-xl font-bold text-green-600'>
								+{formatCurrency(data.totalIncome)}
							</p>
						</div>
						<div className='p-4 rounded-lg bg-red-50 dark:bg-red-950/20'>
							<p className='text-sm text-red-600'>Total Expenses</p>
							<p className='text-xl font-bold text-red-600'>
								-{formatCurrency(data.totalExpenses)}
							</p>
						</div>
						<div className='p-4 rounded-lg bg-muted/50'>
							<p className='text-sm text-muted-foreground'>Closing Balance</p>
							<p className='text-xl font-bold'>
								{formatCurrency(data.closingBalance)}
							</p>
						</div>
					</div>

					{/* Transaction Table */}
					<div className='rounded-md border'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className='w-[100px]'>Date</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Budget Status</TableHead>
									<TableHead className='text-right'>Amount</TableHead>
									<TableHead className='text-right'>Balance</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{/* Opening Balance Row */}
								<TableRow className='bg-muted/30'>
									<TableCell>
										{format(new Date(data.periodStart), 'MMM d')}
									</TableCell>
									<TableCell colSpan={3} className='font-medium'>
										Opening Balance
									</TableCell>
									<TableCell className='text-right'>-</TableCell>
									<TableCell className='text-right font-bold'>
										{formatCurrency(data.openingBalance)}
									</TableCell>
								</TableRow>

								{data.transactions.map((tx) => (
									<TableRow key={tx.id}>
										<TableCell className='text-muted-foreground'>
											{format(new Date(tx.date), 'MMM d')}
										</TableCell>
										<TableCell>{tx.description || '-'}</TableCell>
										<TableCell>
											<Badge variant='outline' className='text-xs'>
												{tx.categoryName}
											</Badge>
										</TableCell>
										<TableCell>
											{tx.type === 'EXPENSE' ? (
												tx.budgetStatus === 'budgeted' ? (
													<Badge variant='default' className='bg-green-600'>
														{tx.budgetName || 'Budgeted'}
													</Badge>
												) : (
													<Badge variant='destructive'>Unbudgeted</Badge>
												)
											) : (
												<span className='text-muted-foreground'>-</span>
											)}
										</TableCell>
										<TableCell
											className={cn(
												'text-right font-medium',
												tx.type === 'INCOME'
													? 'text-green-600'
													: 'text-red-600'
											)}
										>
											<span className='flex items-center justify-end gap-1'>
												{tx.type === 'INCOME' ? (
													<ArrowDownLeft className='h-3 w-3' />
												) : (
													<ArrowUpRight className='h-3 w-3' />
												)}
												{tx.type === 'INCOME' ? '+' : '-'}
												{formatCurrency(tx.amount)}
											</span>
										</TableCell>
										<TableCell className='text-right font-medium'>
											{formatCurrency(tx.runningBalance)}
										</TableCell>
									</TableRow>
								))}

								{/* Closing Balance Row */}
								<TableRow className='bg-muted/30 font-bold'>
									<TableCell>
										{format(new Date(data.periodEnd), 'MMM d')}
									</TableCell>
									<TableCell colSpan={3}>Closing Balance</TableCell>
									<TableCell
										className={cn(
											'text-right',
											data.netChange >= 0 ? 'text-green-600' : 'text-red-600'
										)}
									>
										{data.netChange >= 0 ? '+' : ''}
										{formatCurrency(data.netChange)}
									</TableCell>
									<TableCell className='text-right'>
										{formatCurrency(data.closingBalance)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>

					{data.transactions.length === 0 && (
						<div className='text-center py-8 text-muted-foreground'>
							No transactions found for this period.
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
