'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Wallet, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems } from './nav-items';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetClose,
} from '@/components/ui/sheet';

interface MobileSidebarProps {
	signOutAction: () => Promise<void>;
}

export function MobileSidebar({ signOutAction }: MobileSidebarProps) {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<Button
				variant='ghost'
				size='icon'
				className='sm:hidden'
				onClick={() => setOpen(true)}
			>
				<Menu className='h-6 w-6' />
				<span className='sr-only'>Open menu</span>
			</Button>
			<SheetContent side='left' className='w-64 p-0'>
				<SheetHeader className='flex h-16 flex-row items-center gap-2 border-b px-6'>
					<Wallet className='h-6 w-6' />
					<SheetTitle className='text-lg font-bold'>
						Budget Planner
					</SheetTitle>
				</SheetHeader>
				<nav className='flex flex-col gap-2 px-4 py-4'>
					{navItems.map((item) => (
						<SheetClose asChild key={item.href}>
							<a
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
						</SheetClose>
					))}
				</nav>
				<div className='mt-auto border-t p-4'>
					<form action={signOutAction}>
						<Button
							variant='ghost'
							className='w-full justify-start gap-3 text-muted-foreground'
						>
							<LogOut className='h-4 w-4' />
							Sign Out
						</Button>
					</form>
				</div>
			</SheetContent>
		</Sheet>
	);
}
