import Link from 'next/link';

export function Hero() {
	return (
		<section className='mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32'>
			<div className='flex flex-col items-center text-center'>
				<h1 className='max-w-3xl text-5xl font-bold tracking-tight md:text-6xl'>
					Your finances, clear and simple.
				</h1>
				<p className='mt-6 max-w-xl text-lg text-muted-foreground'>
					Track income, manage budgets, and build savings goals — all
					in one place.
				</p>

				<div className='mt-10 flex flex-col items-center gap-4 sm:flex-row'>
					<Link
						href='/register'
						className='rounded-full bg-primary px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90'
					>
						Get Started — it&apos;s free
					</Link>
					<a
						href='#how-it-works'
						className='rounded-full px-8 py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground'
					>
						See how it works
					</a>
				</div>

				<div className='mt-16 w-full max-w-4xl'>
					<div
						className='overflow-hidden rounded-xl border shadow-2xl'
						style={{
							perspective: '1000px',
						}}
					>
						<div
							className='bg-muted/30'
							style={{
								transform: 'rotateX(2deg)',
								transformOrigin: 'bottom center',
							}}
						>
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
							{/* Dashboard preview placeholder */}
							<div className='aspect-video bg-gradient-to-b from-background to-muted/20 p-8'>
								<div className='grid h-full grid-cols-3 gap-4'>
									<div className='rounded-lg border bg-background p-4'>
										<div className='h-3 w-16 rounded bg-muted' />
										<div className='mt-3 h-6 w-24 rounded bg-muted/60' />
									</div>
									<div className='rounded-lg border bg-background p-4'>
										<div className='h-3 w-16 rounded bg-muted' />
										<div className='mt-3 h-6 w-24 rounded bg-muted/60' />
									</div>
									<div className='rounded-lg border bg-background p-4'>
										<div className='h-3 w-16 rounded bg-muted' />
										<div className='mt-3 h-6 w-24 rounded bg-muted/60' />
									</div>
									<div className='col-span-2 rounded-lg border bg-background p-4'>
										<div className='h-3 w-20 rounded bg-muted' />
										<div className='mt-4 flex gap-2'>
											{[60, 80, 45, 90, 70, 55].map(
												(h, i) => (
													<div
														key={i}
														className='flex-1 rounded bg-primary/20'
														style={{
															height: `${h}%`,
														}}
													/>
												)
											)}
										</div>
									</div>
									<div className='rounded-lg border bg-background p-4'>
										<div className='h-3 w-16 rounded bg-muted' />
										<div className='mt-3 space-y-2'>
											<div className='h-2 w-full rounded-full bg-muted'>
												<div className='h-2 w-3/4 rounded-full bg-primary/30' />
											</div>
											<div className='h-2 w-full rounded-full bg-muted'>
												<div className='h-2 w-1/2 rounded-full bg-primary/30' />
											</div>
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
