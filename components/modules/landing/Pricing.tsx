'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';
import { SectionIndex } from './ui/SectionIndex';

/**
 * Pricing (master IA §10).
 *
 * COMPOSITION (distinct, anti-uniformity): the whole SECTION is its own
 * color-block moment via `.l-section-tint` (the dark emerald block), so it
 * reads as a deliberate beat between the surrounding near-black sections.
 * Layout is a left intro rail (`.l-h2`) + a single premium Free card on the
 * right, NOT a centered heading over identical cards.
 *
 * HONESTY (PRODUCT.md, hard gate): one real Free card listing only SHIPPED
 * features, priced "$0 to start" (never "free forever"), plus one muted note
 * for the AI Advisor framed strictly as coming soon: no price, no fake tiers.
 *
 * Motion: left rises, card scales/rises in; single useReducedMotion() gate.
 * viewport once.
 */
const FREE_FEATURES = [
	'Every transaction in and out, in one clear view',
	'The full story of every account',
	'Budgets that show what is safe to spend',
	'Savings goals that track themselves',
	'Send polished invoices and get paid faster',
	'Bring your bank history over in seconds',
	'Clear reports, with a monthly recap in your inbox',
	'Set your bills once, plus your health at a glance',
];

export function Pricing({ lead = false }: { lead?: boolean }) {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();
	const Heading = lead ? 'h1' : 'h2';

	const fromLeft: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 24 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	const card: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 28, scale: 0.98 },
				visible: {
					opacity: 1,
					y: 0,
					scale: 1,
					transition: {
						duration: 0.6,
						delay: 0.08,
						ease: [0.16, 1, 0.3, 1],
					},
				},
		  };

	return (
		<section
			id='pricing'
			className='l-section-tint relative scroll-mt-24 overflow-hidden py-24 sm:py-28'
		>
			{/* Soft emerald glow so the tinted block has depth. Decorative. */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0'
				style={{
					background:
						'radial-gradient(ellipse 60% 70% at 78% 30%, oklch(0.82 0.13 155 / 18%), transparent 70%)',
				}}
			/>

			<div className='relative mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<div className='grid grid-cols-1 items-center gap-x-16 gap-y-12 lg:grid-cols-12'>
					{/* Left rail: intro */}
					<m.div
						variants={fromLeft}
						initial='hidden'
						whileInView='visible'
						viewport={{ once: true, amount: 0.4 }}
						className='lg:col-span-5'
					>
						<SectionIndex index='05' label='Pricing' />
						<Heading className='l-h2 mt-5'>
							Free to start. Honest about what is next.
						</Heading>
						<p className='mt-6 max-w-md text-base leading-relaxed text-l-text-2 sm:text-lg'>
							Everything you can see today is free while the product
							grows. No credit card, no trial countdown, no surprise
							paywall on the things you already rely on.
						</p>
					</m.div>

					{/* Right: single premium Free card */}
					<m.div
						variants={card}
						initial='hidden'
						whileInView='visible'
						viewport={{ once: true, amount: 0.2 }}
						className='lg:col-span-7'
					>
						<div className='l-glass-elevated rounded-3xl p-8 sm:p-10'>
							<div className='flex items-baseline justify-between gap-4'>
								<div>
									<p className='text-sm font-medium text-l-text-3'>
										Free
									</p>
									<p className='mt-1 text-xl font-semibold text-l-text-1'>
										Everything you see today
									</p>
								</div>
								<div className='text-right'>
									<span className='font-mono text-4xl font-semibold tracking-tight text-l-text-1 sm:text-5xl'>
										$0
									</span>
									<p className='text-xs text-l-text-3'>
										to start
									</p>
								</div>
							</div>

							<div className='my-7 h-px w-full bg-l-border' />

							<ul className='grid gap-3 sm:grid-cols-2'>
								{FREE_FEATURES.map((feature) => (
									<li
										key={feature}
										className='flex items-start gap-3 text-sm text-l-text-2'
									>
										<span className='mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-l-accent-dim text-l-accent'>
											<Check
												className='h-3.5 w-3.5'
												aria-hidden='true'
											/>
										</span>
										{feature}
									</li>
								))}
							</ul>

							<Link
								href='/register'
								className='mt-8 inline-flex w-full items-center justify-center rounded-full bg-l-accent px-7 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-l-accent/90'
							>
								Start free
							</Link>
							<p className='mt-3 text-center text-xs text-l-text-4'>
								No credit card required.
							</p>

							{/* Muted note: AI strictly future-tense, no price */}
							<div className='mt-8 flex items-start gap-3 rounded-2xl border border-l-border bg-l-bg/40 p-5'>
								<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-l-surface-2 text-l-text-3'>
									<Sparkles
										className='h-4 w-4'
										aria-hidden='true'
									/>
								</span>
								<div>
									<div className='flex flex-wrap items-center gap-2'>
										<p className='text-sm font-semibold text-l-text-1'>
											AI Advisor
										</p>
										<span className='rounded-full border border-l-border bg-l-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-l-text-3'>
											Coming soon
										</span>
									</div>
									<p className='mt-1 text-sm leading-relaxed text-l-text-2'>
										The AI Advisor is still in development.
										Pricing has not been decided, and it may
										be a paid add-on later. Start free today
										and you will be first to know when it
										opens.
									</p>
								</div>
							</div>
						</div>
					</m.div>
				</div>
			</div>
		</section>
	);
}
