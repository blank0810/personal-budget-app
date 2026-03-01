export function DashboardPreview() {
	return (
		<section className='py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<h2 className='text-center text-3xl font-bold tracking-tight md:text-4xl'>
					See your full financial picture.
				</h2>

				<div className='mt-16'>
					<div className='overflow-hidden rounded-xl border shadow-xl'>
						{/* Browser chrome */}
						<div className='flex items-center gap-2 border-b bg-muted/50 px-4 py-3'>
							<div className='flex gap-1.5'>
								<div className='h-3 w-3 rounded-full bg-red-400' />
								<div className='h-3 w-3 rounded-full bg-yellow-400' />
								<div className='h-3 w-3 rounded-full bg-green-400' />
							</div>
							<div className='ml-4 flex-1 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground'>
								budgetplanner.app/dashboard
							</div>
						</div>

						{/* Mock dashboard content */}
						<div className='bg-background p-6 md:p-8'>
							{/* Top KPI row */}
							<div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
								{[
									{
										label: 'Total Balance',
										value: '$12,500.00',
									},
									{
										label: 'Monthly Income',
										value: '$5,200.00',
									},
									{
										label: 'Monthly Expenses',
										value: '$3,180.00',
									},
									{
										label: 'Net Savings',
										value: '$2,020.00',
									},
								].map((kpi) => (
									<div
										key={kpi.label}
										className='rounded-lg border p-4'
									>
										<p className='text-xs text-muted-foreground'>
											{kpi.label}
										</p>
										<p className='mt-1 text-lg font-semibold'>
											{kpi.value}
										</p>
									</div>
								))}
							</div>

							{/* Charts row */}
							<div className='mt-6 grid gap-4 md:grid-cols-2'>
								{/* Bar chart mock */}
								<div className='rounded-lg border p-4'>
									<p className='text-sm font-medium'>
										Income vs Expenses
									</p>
									<div className='mt-4 flex items-end gap-3'>
										{[
											[75, 45],
											[80, 55],
											[70, 40],
											[85, 50],
											[90, 60],
											[82, 48],
										].map(([inc, exp], i) => (
											<div
												key={i}
												className='flex flex-1 items-end gap-1'
											>
												<div
													className='flex-1 rounded-t bg-primary/25'
													style={{
														height: `${inc}px`,
													}}
												/>
												<div
													className='flex-1 rounded-t bg-destructive/20'
													style={{
														height: `${exp}px`,
													}}
												/>
											</div>
										))}
									</div>
								</div>

								{/* Budget progress mock */}
								<div className='rounded-lg border p-4'>
									<p className='text-sm font-medium'>
										Budget Progress
									</p>
									<div className='mt-4 space-y-3'>
										{[
											{
												cat: 'Groceries',
												pct: 72,
											},
											{
												cat: 'Transport',
												pct: 45,
											},
											{
												cat: 'Entertainment',
												pct: 88,
											},
											{
												cat: 'Utilities',
												pct: 30,
											},
										].map((b) => (
											<div key={b.cat}>
												<div className='flex justify-between text-xs'>
													<span>{b.cat}</span>
													<span className='text-muted-foreground'>
														{b.pct}%
													</span>
												</div>
												<div className='mt-1 h-2 w-full rounded-full bg-muted'>
													<div
														className='h-2 rounded-full bg-primary/40'
														style={{
															width: `${b.pct}%`,
														}}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Highlight badges */}
				<div className='mt-8 flex flex-wrap justify-center gap-3'>
					{[
						'5-pillar health score',
						'Goals tracking',
						'Reports & PDF export',
					].map((label) => (
						<span
							key={label}
							className='rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground'
						>
							{label}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
