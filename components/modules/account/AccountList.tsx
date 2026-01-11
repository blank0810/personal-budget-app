'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Shield, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { deleteAccountAction } from '@/server/modules/account/account.controller';
import { formatCurrency } from '@/lib/formatters';
import { Account } from '@prisma/client';
import Link from 'next/link';

interface AccountListProps {
	accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
	async function handleDelete(id: string) {
		if (
			confirm(
				'Are you sure you want to delete this account? This action cannot be undone if there are related transactions.'
			)
		) {
			const result = await deleteAccountAction(id);
			if (result?.error) {
				alert(result.error);
			}
		}
	}

	return (
		<div className='rounded-md border bg-card'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead className='text-right'>Balance</TableHead>
						<TableHead className='w-[100px] text-right'>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{accounts.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={4}
								className='text-center h-24 text-muted-foreground'
							>
								No accounts found.
							</TableCell>
						</TableRow>
					) : (
						accounts.map((account) => (
							<TableRow key={account.id}>
								<TableCell className='font-medium'>
									{account.name}
								</TableCell>
								<TableCell>
									<span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20'>
										{account.type}
									</span>
								</TableCell>
								<TableCell className='text-right'>
									<div className='font-bold ml-auto'>
										{formatCurrency(
											Number(account.balance)
										)}
									</div>
									{account.type === 'CREDIT' &&
										account.creditLimit && (
											<div className='flex flex-col items-end gap-1 mt-1'>
												{(() => {
													const creditLimit = Number(
														account.creditLimit
													);
													const balance = Number(
														account.balance
													);
													const utilization =
														balance / creditLimit;
													const availableCredit =
														creditLimit - balance;
													const utilizationPercent =
														Math.round(
															utilization * 100
														);

													// Determine color based on utilization (High = Bad)
													let barColor =
														'bg-green-400';
													if (utilization >= 0.9)
														barColor = 'bg-red-600';
													else if (utilization >= 0.7)
														barColor = 'bg-red-500';
													else if (utilization >= 0.5)
														barColor =
															'bg-orange-500';
													else if (utilization >= 0.3)
														barColor =
															'bg-yellow-500';
													else if (utilization >= 0.1)
														barColor =
															'bg-green-500';

													return (
														<>
															<div className='flex justify-between w-full text-xs'>
																<span
																	className={
																		utilization >=
																		0.7
																			? 'text-red-600 dark:text-red-400'
																			: utilization >=
																			  0.5
																			? 'text-orange-600 dark:text-orange-400'
																			: utilization >=
																			  0.3
																			? 'text-yellow-600 dark:text-yellow-400'
																			: 'text-green-600 dark:text-green-400'
																	}
																>
																	{
																		utilizationPercent
																	}
																	% Used
																</span>
																<span className='text-green-600 dark:text-green-400'>
																	Avail:{' '}
																	{formatCurrency(
																		availableCredit
																	)}
																</span>
															</div>
															<div className='w-full h-1.5 bg-secondary rounded-full overflow-hidden'>
																<div
																	className={`h-full ${barColor}`}
																	style={{
																		width: `${Math.min(
																			utilizationPercent,
																			100
																		)}%`,
																	}}
																/>
															</div>
														</>
													);
												})()}
											</div>
										)}
									{/* Fund Progress Display */}
									{(account.type === 'EMERGENCY_FUND' ||
										account.type === 'FUND') && (
										<div className='flex flex-col items-end gap-1 mt-1'>
											{(() => {
												const balance = Number(account.balance);
												const target = account.targetAmount
													? Number(account.targetAmount)
													: null;
												const mode = account.fundCalculationMode;
												const FundIcon =
													account.type === 'EMERGENCY_FUND'
														? Shield
														: Target;

												if (mode === 'TARGET_PROGRESS' && target && target > 0) {
													const progressPercent = Math.min(
														Math.round((balance / target) * 100),
														100
													);
													const remaining = target - balance;

													// Determine color based on progress (higher = better)
													let barColor = 'bg-red-500';
													if (progressPercent >= 100) barColor = 'bg-green-500';
													else if (progressPercent >= 75) barColor = 'bg-blue-500';
													else if (progressPercent >= 50) barColor = 'bg-yellow-500';
													else if (progressPercent >= 25) barColor = 'bg-orange-500';

													return (
														<>
															<div className='flex items-center gap-1 text-xs text-muted-foreground'>
																<FundIcon className='h-3 w-3' />
																<span>
																	{progressPercent}% of{' '}
																	{formatCurrency(target)}
																</span>
															</div>
															<div className='w-full h-1.5 bg-secondary rounded-full overflow-hidden'>
																<div
																	className={`h-full ${barColor}`}
																	style={{ width: `${progressPercent}%` }}
																/>
															</div>
															{remaining > 0 && (
																<span className='text-xs text-muted-foreground'>
																	{formatCurrency(remaining)} to go
																</span>
															)}
														</>
													);
												} else {
													// MONTHS_COVERAGE mode - just show badge
													return (
														<Badge
															variant='outline'
															className='text-blue-600 border-blue-200 text-xs'
														>
															<FundIcon className='h-3 w-3 mr-1' />
															{account.type === 'EMERGENCY_FUND'
																? 'Emergency Fund'
																: 'Savings Goal'}
														</Badge>
													);
												}
											})()}
										</div>
									)}
								</TableCell>
								<TableCell>
									<div className='flex justify-end gap-2'>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8 text-muted-foreground hover:text-primary'
											asChild
										>
											<Link
												href={`/accounts/${account.id}`}
											>
												<FileText className='h-4 w-4' />
											</Link>
										</Button>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8 text-destructive'
											onClick={() =>
												handleDelete(account.id)
											}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
