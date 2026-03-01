import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function Footer() {
	return (
		<footer className='border-t py-12'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='grid gap-8 sm:grid-cols-3'>
					{/* Brand */}
					<div>
						<div className='flex items-center gap-2'>
							<Wallet className='h-5 w-5' />
							<span className='font-semibold'>
								Budget Planner
							</span>
						</div>
						<p className='mt-2 text-sm text-muted-foreground'>
							Simple personal finance tracking.
						</p>
					</div>

					{/* Product links */}
					<div>
						<p className='text-sm font-medium'>Product</p>
						<ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
							<li>
								<Link
									href='/register'
									className='hover:text-foreground'
								>
									Dashboard
								</Link>
							</li>
							<li>
								<a
									href='/#features'
									className='hover:text-foreground'
								>
									Features
								</a>
							</li>
						</ul>
					</div>

					{/* Support links */}
					<div>
						<p className='text-sm font-medium'>Support</p>
						<ul className='mt-3 space-y-2 text-sm text-muted-foreground'>
							<li>
								<Link
									href='/changelog'
									className='hover:text-foreground'
								>
									Changelog
								</Link>
							</li>
							<li>
								<Link
									href='/changelog#request'
									className='hover:text-foreground'
								>
									Feedback
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className='mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row'>
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
