import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function Footer() {
	return (
		<footer className='border-t border-white/[0.06] py-12'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='grid gap-8 sm:grid-cols-3'>
					{/* Brand */}
					<div>
						<div className='flex items-center gap-2'>
							<Wallet className='h-5 w-5 text-white' />
							<span className='font-semibold text-white'>
								Budget Planner
							</span>
						</div>
						<p className='mt-2 text-sm text-white/40'>
							Simple personal finance tracking.
						</p>
					</div>

					{/* Product links */}
					<div>
						<p className='text-sm font-medium text-white/70'>
							Product
						</p>
						<ul className='mt-3 space-y-2 text-sm text-white/50'>
							<li>
								<Link
									href='/register'
									className='transition-colors hover:text-white'
								>
									Dashboard
								</Link>
							</li>
							<li>
								<Link
									href='/#features'
									className='transition-colors hover:text-white'
								>
									Features
								</Link>
							</li>
						</ul>
					</div>

					{/* Support links */}
					<div>
						<p className='text-sm font-medium text-white/70'>
							Support
						</p>
						<ul className='mt-3 space-y-2 text-sm text-white/50'>
							<li>
								<Link
									href='/changelog'
									className='transition-colors hover:text-white'
								>
									Changelog
								</Link>
							</li>
							<li>
								<Link
									href='/changelog#request'
									className='transition-colors hover:text-white'
								>
									Feedback
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className='mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] pt-6 text-xs text-white/30 sm:flex-row'>
					<p>
						&copy; {new Date().getFullYear()} Budget Planner. All
						rights reserved.
					</p>
					<p>Built with coffee in the Philippines</p>
				</div>
			</div>
		</footer>
	);
}
