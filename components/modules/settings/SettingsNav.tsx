'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
	Bell,
	Database,
	FileText,
	ShieldCheck,
	User,
} from 'lucide-react';

/**
 * Section navigation for the settings area.
 *
 * A row of links on small screens (horizontally scrollable) and a vertical rail
 * from `lg` up. Deliberately NOT a second in-content sidebar component: the app
 * shell already owns the left edge, and nesting a real sidebar inside it reads
 * as a layout bug rather than a settings idiom.
 *
 * Order roughly matches the old top-to-bottom card order so the page stays
 * scannable for anyone who had learned where things were.
 */
const SECTIONS = [
	{ href: '/settings/profile', label: 'Profile', icon: User },
	{ href: '/settings/security', label: 'Security', icon: ShieldCheck },
	{ href: '/settings/notifications', label: 'Notifications', icon: Bell },
	{ href: '/settings/invoicing', label: 'Invoicing', icon: FileText },
	{ href: '/settings/data', label: 'Data & Privacy', icon: Database },
] as const;

export function SettingsNav({ showInvoicing }: { showInvoicing: boolean }) {
	const pathname = usePathname();

	const sections = SECTIONS.filter(
		(section) => showInvoicing || section.href !== '/settings/invoicing'
	);

	return (
		<nav
			aria-label='Settings sections'
			// Scrolls horizontally on mobile rather than collapsing into a select:
			// five short labels fit, and a native scroll keeps every destination
			// discoverable without an extra tap.
			className='-mx-1 flex gap-1 overflow-x-auto px-1 pb-2 lg:mx-0 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0'
		>
			{sections.map((section) => {
				const Icon = section.icon;
				const isActive = pathname === section.href;

				return (
					<Link
						key={section.href}
						href={section.href}
						aria-current={isActive ? 'page' : undefined}
						className={cn(
							// min-h-11 keeps the touch target at 44px, which the
							// default h-9 control height does not reach.
							'flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
							isActive
								? 'bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
							// Destructive intent is signalled on the label only — the
							// section stays visible, because data export lives here too
							// and hiding it would be the wrong call.
							section.href === '/settings/data' && !isActive
								? 'text-destructive/80 hover:text-destructive'
								: ''
						)}
					>
						<Icon className='h-4 w-4 shrink-0' />
						{section.label}
					</Link>
				);
			})}
		</nav>
	);
}
