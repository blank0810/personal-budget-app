export function DashboardPreview() {
	return (
		<section className='landing-reveal py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<p className='text-xs font-medium uppercase tracking-widest text-primary/80'>
						Product
					</p>
					<h2 className='mt-3 text-3xl font-bold text-white md:text-4xl'>
						See your full financial picture.
					</h2>
					<p className='mt-3 text-white/50'>
						Every insight you need, updated in real time.
					</p>
				</div>

				<div className='landing-stagger mt-14 grid gap-4 md:grid-cols-3'>
					{/* Panel 1: Financial Health Score */}
					<div className='landing-reveal rounded-xl border border-white/[0.06] bg-white/[0.03] p-6'>
						<p className='text-xs font-medium text-white/60'>
							Financial Health Score
						</p>
						<div className='mt-6 flex flex-col items-center'>
							{/* Circular progress */}
							<div className='relative flex h-28 w-28 items-center justify-center'>
								<svg
									className='absolute inset-0'
									viewBox='0 0 100 100'
								>
									<circle
										cx='50'
										cy='50'
										r='42'
										fill='none'
										stroke='rgba(255,255,255,0.06)'
										strokeWidth='6'
									/>
									<circle
										cx='50'
										cy='50'
										r='42'
										fill='none'
										stroke='rgb(16,185,129)'
										strokeWidth='6'
										strokeLinecap='round'
										strokeDasharray={`${0.82 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
										transform='rotate(-90 50 50)'
										opacity={0.6}
									/>
								</svg>
								<div className='text-center'>
									<span className='text-2xl font-bold text-white'>
										82
									</span>
									<span className='text-sm text-white/40'>
										/100
									</span>
								</div>
							</div>
							<span className='mt-2 text-xs font-medium text-emerald-400/80'>
								Good
							</span>
						</div>
						<div className='mt-5 flex items-end justify-center gap-1.5'>
							{[60, 80, 45, 90, 70].map((h, i) => (
								<div
									key={i}
									className='w-5 rounded-t bg-white/[0.08]'
									style={{ height: `${h * 0.4}px` }}
								/>
							))}
						</div>
					</div>

					{/* Panel 2: Budget Tracking */}
					<div className='landing-reveal rounded-xl border border-white/[0.06] bg-white/[0.03] p-6'>
						<p className='text-xs font-medium text-white/60'>
							Budget Tracking
						</p>
						<div className='mt-5 space-y-4'>
							{[
								{
									cat: 'Groceries',
									spent: '₱8,500',
									total: '₱12,000',
									pct: 71,
									color: 'bg-emerald-500/40',
								},
								{
									cat: 'Transport',
									spent: '₱3,200',
									total: '₱5,000',
									pct: 64,
									color: 'bg-blue-500/40',
								},
								{
									cat: 'Entertainment',
									spent: '₱4,400',
									total: '₱5,000',
									pct: 88,
									color: 'bg-amber-500/40',
								},
								{
									cat: 'Utilities',
									spent: '₱2,100',
									total: '₱7,000',
									pct: 30,
									color: 'bg-purple-500/40',
								},
							].map((b) => (
								<div key={b.cat}>
									<div className='flex justify-between text-xs'>
										<span className='text-white/60'>
											{b.cat}
										</span>
										<span className='text-white/30'>
											{b.spent} / {b.total}
										</span>
									</div>
									<div className='mt-1.5 h-1.5 w-full rounded-full bg-white/[0.06]'>
										<div
											className={`h-1.5 rounded-full ${b.color}`}
											style={{ width: `${b.pct}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Panel 3: Savings Goals */}
					<div className='landing-reveal rounded-xl border border-white/[0.06] bg-white/[0.03] p-6'>
						<p className='text-xs font-medium text-white/60'>
							Savings Goals
						</p>
						<div className='mt-5 space-y-4'>
							{[
								{
									name: 'Emergency Fund',
									saved: '₱45,000',
									target: '₱100,000',
									pct: 45,
									emoji: '🛡️',
								},
								{
									name: 'New Laptop',
									saved: '₱32,000',
									target: '₱60,000',
									pct: 53,
									emoji: '💻',
								},
							].map((goal) => (
								<div
									key={goal.name}
									className='rounded-lg border border-white/[0.06] bg-white/[0.02] p-4'
								>
									<div className='flex items-center gap-2'>
										<span className='text-base'>
											{goal.emoji}
										</span>
										<span className='text-sm font-medium text-white'>
											{goal.name}
										</span>
									</div>
									<div className='mt-3 flex items-center justify-between text-xs'>
										<span className='text-white/40'>
											{goal.saved}
										</span>
										<span className='text-white/30'>
											{goal.target}
										</span>
									</div>
									<div className='mt-1.5 h-1.5 w-full rounded-full bg-white/[0.06]'>
										<div
											className='h-1.5 rounded-full bg-primary/40'
											style={{
												width: `${goal.pct}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
