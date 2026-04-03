'use client';

import { BadgeCheck, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getInitials(name: string) {
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

export function HeaderUser({
	user,
	signOutAction,
}: {
	user: { name: string; email: string };
	signOutAction: () => Promise<void>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className='flex items-center gap-2 rounded-full pl-2 pr-1 py-1 transition-colors hover:bg-accent focus:outline-none'>
					<span className='hidden text-sm font-medium md:block'>{user.name}</span>
					<Avatar className='h-8 w-8'>
						<AvatarFallback className='text-xs font-semibold'>
							{getInitials(user.name)}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className='w-56 rounded-lg' align='end' sideOffset={8}>
				<DropdownMenuLabel className='p-0 font-normal'>
					<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
						<Avatar className='h-8 w-8 rounded-lg'>
							<AvatarFallback className='rounded-lg'>
								{getInitials(user.name)}
							</AvatarFallback>
						</Avatar>
						<div className='grid flex-1 text-left text-sm leading-tight'>
							<span className='truncate font-medium'>{user.name}</span>
							<span className='truncate text-xs text-muted-foreground'>
								{user.email}
							</span>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<a href='/profile'>
							<BadgeCheck />
							Profile
						</a>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => signOutAction()}>
					<LogOut />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
