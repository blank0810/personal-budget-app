import Link from 'next/link';
import { LayoutGrid, Sparkles, Tag, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionIndex } from './ui/SectionIndex';

/**
 * HomeHighlights — compact overview teaser for the lean Home page.
 *
 * Three honest cards that point into the dedicated pages rather than
 * duplicating their full sections. Pure SSR (no motion) so it stays light
 * on the home route. Copy follows the PRODUCT.md honesty gate: shipped
 * features are present-tense, the AI advisor is strictly future-tense.
 *
 * No gradient text, no side-stripe borders, no em dashes.
 */
const HIGHLIGHTS: {
	icon: LucideIcon;
	title: string;
	body: string;
	href: string;
	cta: string;
}[] = [
	{
		icon: LayoutGrid,
		title: 'Everything in one place',
		body: 'Invoicing, every peso in and out, budgets that show what is safe to spend, savings goals, automatic bills, your bank history, and clear reports. One app for the whole money loop.',
		href: '/features',
		cta: 'See all features',
	},
	{
		icon: Sparkles,
		title: 'An AI advisor on the way',
		body: 'An advisor that will read your transactions, budgets, and invoices to answer the questions you actually ask. In active development, not live yet.',
		href: '/ai-advisor',
		cta: 'See what is coming',
	},
	{
		icon: Tag,
		title: 'Free to start',
		body: 'Create an account and start tracking today. No credit card, no ads, no data selling. We stay honest about what is shipped and what is next.',
		href: '/pricing',
		cta: 'View pricing',
	},
];

export function HomeHighlights() {
	return (
		<section className='py-24'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<div className='max-w-2xl'>
					<SectionIndex index='01' label='Overview' />
					<h2 className='l-h2 mt-5'>
						A quick look at what you get.
					</h2>
					<p className='mt-4 text-base leading-relaxed text-l-text-2 sm:text-lg'>
						Three honest reasons to start. Follow any of them for
						the full story.
					</p>
				</div>

				<div className='mt-12 grid gap-4 md:grid-cols-3'>
					{HIGHLIGHTS.map(({ icon: Icon, title, body, href, cta }) => (
						<Link
							key={href}
							href={href}
							className='group flex flex-col rounded-2xl border border-l-border bg-l-bg p-6 transition-colors hover:border-l-border-mid hover:bg-l-surface-1'
						>
							<span className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-l-accent-dim text-l-accent'>
								<Icon className='h-5 w-5' aria-hidden='true' />
							</span>
							<h3 className='mt-4 text-lg font-semibold tracking-[-0.01em] text-l-text-1'>
								{title}
							</h3>
							<p className='mt-2 flex-1 text-sm leading-relaxed text-l-text-2'>
								{body}
							</p>
							<span className='mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-l-accent'>
								{cta}
								<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
							</span>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
