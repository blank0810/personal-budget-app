'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { SectionEyebrow } from './ui/SectionEyebrow';
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from '@/components/ui/accordion';
import { FAQ_ITEMS } from './faq-data';

/**
 * FAQ — master IA §11, design-system §4.9.
 *
 * Two-column layout: left = eyebrow + h2 + a help link, right = a shadcn
 * Accordion of real Q&As as crawlable text. The questions/answers are kept
 * as a plain data array so budget-seo can mirror them 1:1 into FAQPage
 * JSON-LD (the visible DOM and the structured data must match — PRODUCT.md
 * honesty gate / no schema drift).
 *
 * HONESTY: the AI Advisor answer is strictly future-tense ("in
 * development"); "free today, AI may be paid later"; security/feature
 * claims only where true. No em dashes in copy.
 *
 * Accordion open/close is functional motion (Radix + tw-animate-css) and
 * stays under reduced-motion. Only the block's whileInView entrance is
 * gated. NO em dashes in copy.
 */
export function FAQ({ lead = false }: { lead?: boolean }) {
	const prefersReduced = useReducedMotion();
	const Heading = lead ? 'h1' : 'h2';

	const reveal: Variants = prefersReduced
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 24 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	return (
		<section id='faq' className='scroll-mt-24 py-24'>
			<div className='mx-auto grid max-w-[1184px] gap-12 px-6 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-16 xl:px-12'>
				{/* Left column — heading + help link */}
				<m.div
					variants={reveal}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true, amount: 0.5 }}
					className='lg:sticky lg:top-28 lg:self-start'
				>
					<SectionEyebrow label='FAQ' />
					<Heading className='mt-3 text-3xl font-semibold tracking-[-0.02em] text-l-text-1 sm:text-4xl lg:text-[42px] lg:leading-[1.1]'>
						Questions, answered straight.
					</Heading>
					<p className='mt-4 text-base leading-relaxed text-l-text-2'>
						No spin on what is live, what is free, and what is
						still being built.
					</p>
					<Link
						href='/changelog#request'
						className='group mt-6 inline-flex items-center gap-2 text-sm font-medium text-l-accent transition-colors hover:text-l-accent/80'
					>
						Still have a question? Ask on the feature board
						<ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
					</Link>
				</m.div>

				{/* Right column — accordion */}
				<m.div
					variants={reveal}
					initial='hidden'
					whileInView='visible'
					viewport={{ once: true, amount: 0.2 }}
				>
					<Accordion type='single' collapsible className='w-full'>
						{FAQ_ITEMS.map(({ q, a }, i) => (
							<AccordionItem
								key={q}
								value={`faq-${i}`}
								className='border-l-border'
							>
								<AccordionTrigger className='py-5 text-base font-medium text-l-text-1 hover:no-underline [&>svg]:text-l-text-3'>
									{q}
								</AccordionTrigger>
								<AccordionContent className='pb-5 pr-2 text-[15px] leading-relaxed text-l-text-2'>
									{a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</m.div>
			</div>
		</section>
	);
}
