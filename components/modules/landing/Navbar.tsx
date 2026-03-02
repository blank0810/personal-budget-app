import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function Navbar() {
	return (
		<header className='sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl'>
			<nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'>
				<Link href='/' className='flex items-center gap-2'>
					<Wallet className='h-6 w-6 text-white' />
					<span className='text-lg font-semibold tracking-tight text-white'>
						Budget Planner
					</span>
				</Link>

				<div className='flex items-center gap-3'>
					<Link
						href='/login'
						className='rounded-md px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white'
					>
						Login
					</Link>
					<Link
						href='/register'
						className='rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90'
					>
						Start tracking free
					</Link>
				</div>
			</nav>
		</header>
	);
}
