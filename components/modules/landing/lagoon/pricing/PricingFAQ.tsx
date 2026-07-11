'use client';

import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from '@/components/ui/accordion';
import { LagoonReveal } from '../LagoonReveal';

const FAQ_ITEMS = [
	{
		q: 'Is it really free?',
		a: 'Yes. All core budgeting features -- transactions, budgets, savings goals, monthly reports, PDF export, and CSV import -- are free forever for personal use. There is no expiry date, no trial period, and no feature gate behind a paywall.',
	},
	{
		q: "What's the catch?",
		a: "There isn't one. The app is self-funded and built for personal use first. A Pro tier is being planned for advanced and AI-powered features, but everything that exists today will stay free.",
	},
	{
		q: 'Will my data be locked in?',
		a: 'No. You can export all your transactions as CSV at any time directly from the app. Your financial data is yours and will always be portable.',
	},
	{
		q: 'Do I need a credit card to sign up?',
		a: 'No. You can create an account with just your email address. No payment information is collected at registration or at any point while you are on the free plan.',
	},
] as const;

/**
 * PricingFAQ — four honest Q&As about pricing, using shadcn Accordion.
 *
 * Answers are strictly factual: no pricing is fabricated, AI features are
 * described in future tense, and data portability is confirmed.
 *
 * Styled with Lagoon design tokens (raw hex values) so this component works
 * independently of any global CSS variable theme.
 * Client component — Accordion requires DOM interaction.
 */
export function PricingFAQ() {
	return (
		<section aria-label='Pricing FAQ' className='bg-[var(--lagoon-surface)] px-6 py-16 md:px-10 md:py-20'>
			<div className='mx-auto max-w-[1184px]'>
				<LagoonReveal className='mx-auto max-w-[680px]'>
					{/* Header */}
					<div className='mb-10 text-center'>
						<p className='mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							FAQ
						</p>
						<h2
							className='lagoon-section-title text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Common questions
						</h2>
					</div>

					{/* Accordion */}
					<Accordion type='single' collapsible className='w-full divide-y divide-[var(--lagoon-border)]'>
						{FAQ_ITEMS.map(({ q, a }, i) => (
							<AccordionItem
								key={q}
								value={`faq-${i}`}
								className='border-none'
							>
								<AccordionTrigger
									className='py-5 text-left text-[15px] font-semibold text-[var(--lagoon-ink)] hover:no-underline [&>svg]:text-[var(--lagoon-muted)]'
									style={{ fontFamily: 'var(--lagoon-font-body, inherit)' }}
								>
									{q}
								</AccordionTrigger>
								<AccordionContent className='pb-5 text-[15px] leading-[1.75] text-[var(--lagoon-body)]'>
									{a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</LagoonReveal>
			</div>
		</section>
	);
}
