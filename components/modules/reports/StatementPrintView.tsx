'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { StatementPrintPayload } from '@/server/modules/report/report.types';

// Format currency for display
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-PH', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

export function StatementPrintView({
	statement,
	accountName,
	userName,
}: StatementPrintPayload) {
	// Auto-trigger print dialog when page loads
	useEffect(() => {
		const timer = setTimeout(() => {
			window.print();
		}, 500);
		return () => clearTimeout(timer);
	}, []);

	const periodStart = new Date(statement.periodStart);
	const periodEnd = new Date(statement.periodEnd);

	return (
		<>
			{/* Print-specific styles */}
			<style jsx global>{`
				@media print {
					@page {
						size: A4;
						margin: 10mm;
					}
					body {
						print-color-adjust: exact;
						-webkit-print-color-adjust: exact;
					}
					.no-print {
						display: none !important;
					}
				}
				/* Force light mode colors */
				body {
					background: white !important;
					color: #0f172a !important;
				}
			`}</style>

			<div className='min-h-screen bg-white p-8 max-w-4xl mx-auto font-sans'>
				{/* Header Section */}
				<header className='mb-8'>
					{/* Top Row: Logo + Title */}
					<div className='flex justify-between items-start mb-6'>
						{/* Logo and App Name */}
						<div className='flex items-center gap-3'>
							<div className='w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center'>
								<span className='text-white font-bold text-lg'>P</span>
							</div>
							<span className='text-slate-700 font-medium'>
								Personal Budget
							</span>
						</div>

						{/* Title and Period */}
						<div className='text-right'>
							<h1 className='text-2xl font-bold text-slate-900'>
								Statement of Account
							</h1>
							<p className='text-slate-500 text-sm mt-1'>
								Period: {format(periodStart, 'MMMM d, yyyy')} -{' '}
								{format(periodEnd, 'MMMM d, yyyy')}
							</p>
						</div>
					</div>

					{/* Account Info + Summary - Two Column Layout */}
					<div className='flex gap-8'>
						{/* Left Column: Account Info */}
						<div className='flex-1'>
							<h2 className='text-xl font-bold text-slate-900 mb-4'>
								{accountName}
							</h2>

							<div className='space-y-3'>
								<div>
									<p className='text-xs text-slate-500 uppercase tracking-wide'>
										Name
									</p>
									<p className='text-slate-900 font-medium'>{userName}</p>
								</div>

								<div>
									<p className='text-xs text-slate-500 uppercase tracking-wide'>
										Statement Type
									</p>
									<p className='text-slate-900 font-medium'>
										Transaction Summary
									</p>
								</div>

								<div>
									<p className='text-xs text-slate-500 uppercase tracking-wide'>
										Generated
									</p>
									<p className='text-slate-900 font-medium'>
										{format(new Date(), 'MMMM d, yyyy')}
									</p>
								</div>
							</div>
						</div>

						{/* Right Column: Summary Card */}
						<div className='w-72 bg-slate-50 rounded-lg p-5'>
							<h3 className='text-sm font-bold text-slate-900 mb-4'>
								Summary
							</h3>

							<div className='space-y-2 text-sm'>
								<div className='flex justify-between'>
									<span className='text-slate-600'>Opening balance</span>
									<span className='font-mono text-slate-900'>
										{formatCurrency(statement.openingBalance)}
									</span>
								</div>

								<div className='flex justify-between'>
									<span className='text-slate-600'>Income (+)</span>
									<span className='font-mono text-teal-600'>
										{formatCurrency(statement.totalIncome)}
									</span>
								</div>

								<div className='flex justify-between'>
									<span className='text-slate-600'>Expenses (-)</span>
									<span className='font-mono text-red-400'>
										-{formatCurrency(statement.totalExpenses)}
									</span>
								</div>

								<div className='border-t border-slate-200 my-2'></div>

								<div className='flex justify-between'>
									<span className='text-slate-600'>Net change</span>
									<span
										className={`font-mono font-medium ${
											statement.netChange >= 0
												? 'text-teal-600'
												: 'text-red-400'
										}`}
									>
										{statement.netChange >= 0 ? '+' : ''}
										{formatCurrency(statement.netChange)}
									</span>
								</div>

								<div className='flex justify-between font-bold'>
									<span className='text-slate-900'>Closing balance</span>
									<span className='font-mono text-slate-900'>
										{formatCurrency(statement.closingBalance)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</header>

				{/* Transaction Table */}
				<section>
					<h3 className='text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide'>
						Transaction Details
					</h3>

					<table className='w-full text-sm'>
						<thead>
							<tr className='border-b-2 border-slate-200'>
								<th className='text-left py-3 text-xs text-slate-500 uppercase tracking-wide font-medium'>
									Date
								</th>
								<th className='text-left py-3 text-xs text-slate-500 uppercase tracking-wide font-medium'>
									Description
								</th>
								<th className='text-right py-3 text-xs text-slate-500 uppercase tracking-wide font-medium'>
									Debit
								</th>
								<th className='text-right py-3 text-xs text-slate-500 uppercase tracking-wide font-medium'>
									Credit
								</th>
								<th className='text-right py-3 text-xs text-slate-500 uppercase tracking-wide font-medium'>
									Balance
								</th>
							</tr>
						</thead>
						<tbody>
							{/* Opening Balance Row */}
							<tr className='bg-slate-50'>
								<td className='py-3 text-slate-600'>
									{format(periodStart, 'MMM d')}
								</td>
								<td className='py-3 font-medium text-slate-900'>
									Opening Balance
								</td>
								<td className='py-3 text-right text-slate-400'>-</td>
								<td className='py-3 text-right text-slate-400'>-</td>
								<td className='py-3 text-right font-mono font-medium text-slate-900'>
									{formatCurrency(statement.openingBalance)}
								</td>
							</tr>

							{/* Transaction Rows */}
							{statement.transactions.map((tx, index) => (
								<tr
									key={tx.id}
									className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
								>
									<td className='py-3 text-slate-600'>
										{format(new Date(tx.date), 'MMM d')}
									</td>
									<td className='py-3'>
										<div className='font-medium text-slate-900'>
											{tx.description || tx.categoryName}
										</div>
										<div className='text-xs text-slate-500 flex items-center gap-2'>
											<span>{tx.type === 'INCOME' ? 'Income' : 'Expense'}</span>
											<span>•</span>
											<span>{tx.categoryName}</span>
											{tx.type === 'EXPENSE' && (
												<>
													<span>•</span>
													<span
														className={`inline-flex items-center gap-1 ${
															tx.budgetStatus === 'budgeted'
																? 'text-teal-600'
																: 'text-red-400'
														}`}
													>
														<span
															className={`w-1.5 h-1.5 rounded-full ${
																tx.budgetStatus === 'budgeted'
																	? 'bg-teal-500'
																	: 'bg-red-400'
															}`}
														></span>
														{tx.budgetStatus === 'budgeted'
															? tx.budgetName || 'Budgeted'
															: 'Unbudgeted'}
													</span>
												</>
											)}
										</div>
									</td>
									<td className='py-3 text-right font-mono'>
										{tx.type === 'EXPENSE' ? (
											<span className='text-red-400'>
												{formatCurrency(tx.amount)}
											</span>
										) : (
											<span className='text-slate-400'>-</span>
										)}
									</td>
									<td className='py-3 text-right font-mono'>
										{tx.type === 'INCOME' ? (
											<span className='text-teal-600'>
												{formatCurrency(tx.amount)}
											</span>
										) : (
											<span className='text-slate-400'>-</span>
										)}
									</td>
									<td className='py-3 text-right font-mono font-medium text-slate-900'>
										{formatCurrency(tx.runningBalance)}
									</td>
								</tr>
							))}

							{/* Closing Balance Row */}
							<tr className='bg-slate-100 font-bold border-t-2 border-slate-200'>
								<td className='py-3 text-slate-600'>
									{format(periodEnd, 'MMM d')}
								</td>
								<td className='py-3 text-slate-900'>Closing Balance</td>
								<td className='py-3 text-right font-mono text-red-400'>
									{formatCurrency(statement.totalExpenses)}
								</td>
								<td className='py-3 text-right font-mono text-teal-600'>
									{formatCurrency(statement.totalIncome)}
								</td>
								<td className='py-3 text-right font-mono text-slate-900'>
									{formatCurrency(statement.closingBalance)}
								</td>
							</tr>
						</tbody>
					</table>

					{/* Empty State */}
					{statement.transactions.length === 0 && (
						<div className='text-center py-12 text-slate-500'>
							No transactions found for this period.
						</div>
					)}
				</section>

				{/* Footer */}
				<footer className='mt-12 pt-6 border-t border-slate-200'>
					<div className='flex justify-between text-xs text-slate-400'>
						<span>
							Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
						</span>
						<span>Page 1 of 1</span>
					</div>
					<p className='text-xs text-slate-400 mt-2 text-center'>
						This statement was generated by Personal Budget App.
					</p>
				</footer>

				{/* Print Button (hidden when printing) */}
				<div className='no-print fixed bottom-6 right-6 flex gap-2'>
					<button
						onClick={() => window.print()}
						className='bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-teal-700 transition-colors'
					>
						Save as PDF
					</button>
					<button
						onClick={() => window.close()}
						className='bg-slate-200 text-slate-700 px-4 py-2 rounded-lg shadow-lg hover:bg-slate-300 transition-colors'
					>
						Close
					</button>
				</div>
			</div>
		</>
	);
}
