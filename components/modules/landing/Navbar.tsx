import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function Navbar() {
	return (
		<header className='sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm'>
			<nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'>
				<Link href='/' className='flex items-center gap-2'>
					<Wallet className='h-6 w-6' />
					<span className='text-lg font-semibold tracking-tight'>
						Budget Planner
					</span>
				</Link>

				<div className='flex items-center gap-3'>
					<Link
						href='/login'
						className='rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
					>
						Login
					</Link>
					<Link
						href='/register'
						className='rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
					>
						Get Started
					</Link>
				</div>
			</nav>
		</header>
	);
}
