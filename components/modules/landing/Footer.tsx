import Link from 'next/link';
import { Wallet } from 'lucide-react';

/**
 * LandingFooter — master IA §13.
 *
 * Light footer band (`bg-l-surface-1 border-t border-l-border`), 4-col on
 * desktop: Brand, Product, Support, Legal. Bottom bar carries the personal
 * "Built independently" + "Built with coffee in the Philippines" lines.
 *
 * No animation (it sits below scroll engagement, design-system §4.11) and
 * no fake company info. Static server component. No em dashes in copy.
 */
const PRODUCT_LINKS = [
	{ label: 'Features', href: '/#features' },
	{ label: 'Invoicing', href: '/invoicing' },
	{ label: 'How it works', href: '/#how-it-works' },
	{ label: 'AI Advisor', href: '/#ai-advisor' },
	{ label: 'Pricing', href: '/#pricing' },
	{ label: 'FAQ', href: '/#faq' },
];

const SUPPORT_LINKS = [
	{ label: 'Changelog', href: '/changelog' },
	{ label: 'Feature requests', href: '/changelog#request' },
];

const LEGAL_LINKS = [
	{ label: 'Privacy', href: '/privacy' },
	{ label: 'Terms', href: '/terms' },
];

function FooterColumn({
	heading,
	links,
}: {
	heading: string;
	links: { label: string; href: string }[];
}) {
	return (
		<div>
			<p className='text-[11px] font-medium uppercase tracking-[0.08em] text-l-text-3'>
				{heading}
			</p>
			<ul className='mt-4 space-y-2.5'>
				{links.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href}
							className='text-sm text-l-text-2 transition-colors duration-150 hover:text-l-text-1'
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

export function LandingFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className='border-t border-l-border bg-l-surface-1'>
			<div className='mx-auto max-w-[1184px] px-6 py-16 md:px-10 xl:px-12'>
				<div className='grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-12'>
					{/* Brand */}
					<div>
						<div className='flex items-center gap-2 text-l-text-1'>
							<span className='flex h-8 w-8 items-center justify-center rounded-lg bg-l-accent-dim text-l-accent'>
								<Wallet className='h-[18px] w-[18px]' />
							</span>
							<span className='text-[15px] font-semibold tracking-[-0.01em]'>
								Budget Planner
							</span>
						</div>
						<p className='mt-4 max-w-xs text-sm leading-relaxed text-l-text-2'>
							Personal budgeting and money tracking. No bank
							linking; you log it, you own it.
						</p>
					</div>

					<FooterColumn heading='Product' links={PRODUCT_LINKS} />
					<FooterColumn heading='Support' links={SUPPORT_LINKS} />
					<FooterColumn heading='Legal' links={LEGAL_LINKS} />
				</div>

				{/* Bottom bar */}
				<div className='mt-14 flex flex-col items-start justify-between gap-2 border-t border-l-border pt-7 text-xs text-l-text-4 sm:flex-row sm:items-center'>
					<p>
						&copy; {year} Budget Planner. Built independently.
					</p>
					<p>Built with coffee in the Philippines.</p>
				</div>
			</div>
		</footer>
	);
}
