import { DashboardService } from '@/server/modules/dashboard/dashboard.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { groupAccountsByClass, ACCOUNT_CLASS_META } from '@/lib/account-utils';
import type { AccountClass } from '@/lib/account-utils';

interface TransactionsAndAccountsSectionProps {
	userId: string;
	currency: string;
}

export async function TransactionsAndAccountsSection({
	userId,
	currency,
}: TransactionsAndAccountsSectionProps) {
	const [recentTransactions, accounts] = await Promise.all([
		DashboardService.getRecentTransactions(userId, 5),
		DashboardService.getAccountBalances(userId),
	]);

	const iconMap: Record<AccountClass, typeof Wallet> = {
		liquid: Wallet,
		savings: PiggyBank,
		liability: CreditCard,
	};
	const bgMap: Record<AccountClass, string> = {
		liquid: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600',
		savings: 'bg-blue-100 dark:bg-blue-900 text-blue-600',
		liability: 'bg-red-100 dark:bg-red-900 text-red-600',
	};
	const colorMap: Record<AccountClass, string> = {
		liquid: 'text-emerald-600',
		savings: 'text-blue-600',
		liability: 'text-red-600',
	};
	const classOrder: AccountClass[] = ['liquid', 'savings', 'liability'];

	const grouped = groupAccountsByClass(accounts);

	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
			{/* Recent Transactions */}
			<Card className='md:col-span-2 lg:col-span-4'>
				<CardHeader className='flex flex-row items-center justify-between'>
					<CardTitle>Recent Transactions</CardTitle>
					<span className='text-xs text-muted-foreground'>Last 5 shown</span>
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						{recentTransactions.slice(0, 5).map((transaction) => (
							<div key={transaction.id} className='flex items-center'>
								<div
									className={`flex h-9 w-9 items-center justify-center rounded-full border ${
										transaction.type === 'INCOME'
											? 'bg-green-100'
											: 'bg-red-100'
									}`}
								>
									{transaction.type === 'INCOME' ? (
										<ArrowDownLeft className='h-4 w-4 text-green-500' />
									) : (
										<ArrowUpRight className='h-4 w-4 text-red-500' />
									)}
								</div>
								<div className='ml-4 space-y-1'>
									<p className='text-sm font-medium leading-none'>
										{transaction.description || transaction.category.name}
									</p>
									<p className='text-sm text-muted-foreground'>
										{transaction.category.name} &bull;{' '}
										{format(new Date(transaction.date), 'MMM d')}
									</p>
								</div>
								<div
									className={`ml-auto font-medium ${
										transaction.type === 'INCOME'
											? 'text-green-600'
											: 'text-red-600'
									}`}
								>
									{transaction.type === 'INCOME' ? '+' : '-'}
									{formatCurrency(transaction.amount?.toNumber() ?? 0, {
										currency,
									})}
								</div>
							</div>
						))}
						{recentTransactions.length === 0 && (
							<p className='text-muted-foreground text-center py-4'>
								No recent transactions
							</p>
						)}
					</div>
					<div className='mt-4 pt-4 border-t'>
						<div className='flex justify-end'>
							<a
								href='/expense'
								className='text-primary hover:underline text-xs'
							>
								View all transactions {'\u2192'}
							</a>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Account List: Grouped by Classification */}
			<Card className='md:col-span-2 lg:col-span-3'>
				<CardHeader>
					<CardTitle>Accounts</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='max-h-[400px] overflow-y-auto pr-4'>
						<div className='space-y-6'>
							{classOrder.map((cls, idx) => {
								const groupAccounts = grouped[cls];
								if (groupAccounts.length === 0) return null;
								const meta = ACCOUNT_CLASS_META[cls];
								const Icon = iconMap[cls];
								const isLiability = cls === 'liability';

								return (
									<div key={cls}>
										{idx > 0 &&
											classOrder
												.slice(0, idx)
												.some((c) => grouped[c].length > 0) && (
												<div className='border-t border-border mb-6' />
											)}
										<div>
											<h3
												className={`text-xs font-semibold mb-3 uppercase tracking-wider flex items-center gap-1 ${colorMap[cls]}`}
											>
												<Icon className='h-3 w-3' /> {meta.label}
											</h3>
											<div className='space-y-4'>
												{groupAccounts.map((account) => {
													const balance = Number(account.balance);
													const creditLimit = Number(account.creditLimit ?? 0);
													const hasCreditLimit = isLiability && creditLimit > 0;
													const utilization = hasCreditLimit ? balance / creditLimit : 0;
													const utilizationPercent = Math.round(utilization * 100);
													const availableCredit = hasCreditLimit ? creditLimit - balance : 0;

													let barColor = 'bg-green-400';
													if (utilization >= 0.9) barColor = 'bg-red-600';
													else if (utilization >= 0.7) barColor = 'bg-red-500';
													else if (utilization >= 0.5) barColor = 'bg-orange-500';
													else if (utilization >= 0.3) barColor = 'bg-orange-400';
													else if (utilization >= 0.1) barColor = 'bg-yellow-400';

													return (
														<div key={account.id} className='space-y-1'>
															<div className='flex items-center'>
																<div
																	className={`flex h-9 w-9 items-center justify-center rounded-full ${bgMap[cls]}`}
																>
																	<Icon className='h-4 w-4' />
																</div>
																<div className='ml-4 space-y-1'>
																	<p className='text-sm font-medium leading-none'>
																		{account.name}
																	</p>
																	<div className='flex gap-2 text-xs text-muted-foreground'>
																		<span>{account.type}</span>
																	</div>
																</div>
																<div
																	className={`ml-auto font-medium ${
																		isLiability ? 'text-red-600' : ''
																	}`}
																>
																	{formatCurrency(balance, { currency })}
																</div>
															</div>
															{hasCreditLimit && (
																<div className='ml-13 pl-0.5'>
																	<div className='flex justify-between text-xs text-muted-foreground mb-1'>
																		<span>{utilizationPercent}% Used</span>
																		<span>
																			Avail:{' '}
																			{formatCurrency(availableCredit, { currency })}
																		</span>
																	</div>
																	<div className='h-1.5 bg-secondary rounded-full overflow-hidden'>
																		<div
																			className={`h-full rounded-full ${barColor}`}
																			style={{
																				width: `${Math.min(utilizationPercent, 100)}%`,
																			}}
																		/>
																	</div>
																</div>
															)}
														</div>
													);
												})}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
