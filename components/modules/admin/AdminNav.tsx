'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Workflow, type LucideIcon } from 'lucide-react';

const NAV_ITEMS: Array<{
	label: string;
	href: string;
	icon?: LucideIcon;
}> = [
	{ label: 'Dashboard', href: '/admin' },
	{ label: 'Users', href: '/admin/users' },
	{ label: 'Feature Requests', href: '/admin/feature-requests' },
	{ label: 'Feature Flags', href: '/admin/feature-flags' },
	{ label: 'Automations', href: '/admin/automations', icon: Workflow },
	{ label: 'System', href: '/admin/system' },
];

export function AdminNav() {
	const pathname = usePathname();

	return (
		<nav className='flex gap-1 overflow-x-auto py-2'>
			{NAV_ITEMS.map((item) => {
				const Icon = item.icon;
				const isActive =
					item.href === '/admin'
						? pathname === '/admin'
						: pathname.startsWith(item.href);

				return (
					<Link
						key={item.href}
						href={item.href}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
							isActive
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:text-foreground hover:bg-muted'
						}`}
					>
						{Icon && <Icon className='h-3.5 w-3.5' />}
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
