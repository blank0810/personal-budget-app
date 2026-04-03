'use client';

import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useQuickAction } from '@/components/modules/dashboard/QuickActionSheet';

interface GreetingHeaderProps {
	userName: string;
}

function getGreeting(hour: number): string {
	if (hour >= 5 && hour < 12) return 'Good morning';
	if (hour >= 12 && hour < 18) return 'Good afternoon';
	return 'Good evening';
}

export function GreetingHeader({ userName }: GreetingHeaderProps) {
	const hour = new Date().getHours();
	const greeting = getGreeting(hour);
	const { openSheet } = useQuickAction();

	return (
		<div className='animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
			<div>
				<h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
					{greeting}, {userName}
				</h1>
				<p className='text-muted-foreground mt-1 text-sm'>
					Welcome back to your financial dashboard
				</p>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size='icon' className='h-9 w-9 rounded-full'>
						<Plus className='h-4 w-4' />
						<span className='sr-only'>Add transaction</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' className='w-44'>
					<DropdownMenuItem
						className='cursor-pointer'
						onSelect={() => openSheet('income')}
					>
						<ArrowDownLeft className='text-green-500' />
						<span>Income</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className='cursor-pointer'
						onSelect={() => openSheet('expense')}
					>
						<ArrowUpRight className='text-red-500' />
						<span>Expense</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className='cursor-pointer'
						onSelect={() => openSheet('transfer')}
					>
						<ArrowLeftRight className='text-blue-500' />
						<span>Transfer</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className='cursor-pointer'
						onSelect={() => openSheet('payment')}
					>
						<CreditCard className='text-amber-500' />
						<span>Payment</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
