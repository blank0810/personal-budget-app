import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero() {
	return (
		<section className='relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32'>
			{/* Glow effects */}
			<div className='landing-glow absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 bg-primary/20' />
			<div className='landing-glow absolute right-0 top-20 h-[300px] w-[400px] bg-blue-500/10' />

			<div className='relative flex flex-col items-center text-center'>
				<h1 className='max-w-4xl bg-gradient-to-b from-white to-white/70 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl'>
					Stop guessing where your money goes.
				</h1>
				<p className='mt-6 max-w-xl text-lg text-white/60 md:text-xl'>
					Budget smarter, save faster, and see your full financial
					picture — in one free app.
				</p>

				<div className='mt-10 flex flex-col items-center gap-4 sm:flex-row'>
					<Link
						href='/register'
						className='rounded-full bg-white px-8 py-3 text-base font-medium text-black transition-colors hover:bg-white/90'
					>
						Start tracking free
					</Link>
					<a
						href='#how-it-works'
						className='flex items-center gap-2 rounded-full px-8 py-3 text-base font-medium text-white/60 transition-colors hover:text-white'
					>
						See how it works
						<ArrowRight className='h-4 w-4' />
					</a>
				</div>

				<p className='mt-4 text-sm text-white/40'>
					No credit card required. Free forever.
				</p>

				{/* Dashboard mockup */}
				<div className='mt-16 w-full max-w-4xl'>
					<div
						className='overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-primary/5'
						style={{ perspective: '1000px' }}
					>
						<div
							style={{
								transform: 'rotateX(2deg)',
								transformOrigin: 'bottom center',
							}}
						>
							{/* Browser chrome */}
							<div className='flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3'>
								<div className='flex gap-1.5'>
									<div className='h-3 w-3 rounded-full bg-white/20' />
									<div className='h-3 w-3 rounded-full bg-white/20' />
									<div className='h-3 w-3 rounded-full bg-white/20' />
								</div>
								<div className='ml-4 flex-1 rounded-md bg-white/5 px-3 py-1 text-xs text-white/40'>
									budgetplanner.app/dashboard
								</div>
							</div>

							{/* Dashboard content */}
							<div className='bg-background p-6 md:p-8'>
								{/* KPI row */}
								<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
									{[
										{ label: 'Total Balance', value: '₱125,000' },
										{ label: 'Monthly Income', value: '₱52,000' },
										{ label: 'Monthly Expenses', value: '₱31,800' },
										{ label: 'Net Savings', value: '₱20,200' },
									].map((kpi) => (
										<div
											key={kpi.label}
											className='rounded-lg border border-white/[0.06] bg-white/[0.03] p-3'
										>
											<p className='text-[10px] text-white/40'>
												{kpi.label}
											</p>
											<p className='mt-1 text-sm font-semibold text-white'>
												{kpi.value}
											</p>
										</div>
									))}
								</div>

								{/* Charts row */}
								<div className='mt-4 grid gap-3 md:grid-cols-2'>
									{/* Bar chart */}
									<div className='rounded-lg border border-white/[0.06] bg-white/[0.03] p-4'>
										<p className='text-xs font-medium text-white/60'>
											Income vs Expenses
										</p>
										<div className='mt-3 flex items-end gap-2'>
											{[
												[70, 42],
												[75, 50],
												[65, 38],
												[80, 48],
												[85, 55],
												[78, 45],
											].map(([inc, exp], i) => (
												<div
													key={i}
													className='flex flex-1 items-end gap-0.5'
												>
													<div
														className='flex-1 rounded-t bg-emerald-500/30'
														style={{
															height: `${inc}px`,
														}}
													/>
													<div
														className='flex-1 rounded-t bg-white/10'
														style={{
															height: `${exp}px`,
														}}
													/>
												</div>
											))}
										</div>
									</div>

									{/* Budget progress */}
									<div className='rounded-lg border border-white/[0.06] bg-white/[0.03] p-4'>
										<p className='text-xs font-medium text-white/60'>
											Budget Progress
										</p>
										<div className='mt-3 space-y-2.5'>
											{[
												{ cat: 'Groceries', pct: 68, color: 'bg-emerald-500/40' },
												{ cat: 'Transport', pct: 45, color: 'bg-blue-500/40' },
												{ cat: 'Entertainment', pct: 88, color: 'bg-amber-500/40' },
												{ cat: 'Utilities', pct: 30, color: 'bg-purple-500/40' },
											].map((b) => (
												<div key={b.cat}>
													<div className='flex justify-between text-[10px]'>
														<span className='text-white/50'>{b.cat}</span>
														<span className='text-white/30'>{b.pct}%</span>
													</div>
													<div className='mt-1 h-1.5 w-full rounded-full bg-white/[0.06]'>
														<div
															className={`h-1.5 rounded-full ${b.color}`}
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
				</div>
			</div>
		</section>
	);
}
