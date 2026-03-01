'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
	{ label: 'Dashboard', href: '/admin' },
	{ label: 'Users', href: '/admin/users' },
	{ label: 'Feature Requests', href: '/admin/feature-requests' },
	{ label: 'Feature Flags', href: '/admin/feature-flags' },
];

export function AdminNav() {
	const pathname = usePathname();

	return (
		<nav className='flex gap-1 overflow-x-auto py-2'>
			{NAV_ITEMS.map((item) => {
				const isActive =
					item.href === '/admin'
						? pathname === '/admin'
						: pathname.startsWith(item.href);

				return (
					<Link
						key={item.href}
						href={item.href}
						className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
							isActive
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:text-foreground hover:bg-muted'
						}`}
					>
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
