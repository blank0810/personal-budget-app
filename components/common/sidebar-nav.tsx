'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';

export function SidebarNav() {
	const pathname = usePathname();

	return (
		<nav className='flex flex-col gap-2 px-4 py-4'>
			{navItems.map((item) => (
				<a
					key={item.href}
					href={item.href}
					className={cn(
						'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-muted',
						pathname === item.href ||
							pathname?.startsWith(`${item.href}/`)
							? 'bg-muted text-primary'
							: 'text-muted-foreground'
					)}
				>
					<item.icon className='h-4 w-4' />
					{item.title}
				</a>
			))}
		</nav>
	);
}
