import type { Metadata } from 'next';
import Link from 'next/link';
import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';
import { LagoonCTA } from '@/components/modules/landing/lagoon/LagoonCTA';
import { LagoonFaqAccordion } from '@/components/modules/landing/lagoon/faq/LagoonFaqAccordion';
import { FAQ_GROUPS } from '@/components/modules/landing/lagoon/faq/faq-data';

export const metadata: Metadata = {
	title: 'Budgeting App FAQ',
	description:
		'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
	alternates: {
		canonical: '/faq',
	},
	openGraph: {
		title: 'Budgeting App FAQ',
		description:
			'Straight answers about pricing, your data, the AI advisor on the way, and how the app fits the way you manage money.',
		url: '/faq',
		siteName: 'Budget Planner',
		// og:image comes from the route-level opengraph-image.tsx (file convention).
	},
};

/**
 * FAQPage JSON-LD — generated from the shared faq-data module.
 *
 * Single source of truth: any edit to faq-data.ts is automatically reflected
 * here. No manual sync required. Schema↔content parity is guaranteed.
 *
 * Honesty enforced:
 * - No aggregateRating / review.
 * - AI Advisor answer is future-tense only ("not yet … in active development").
 * - All Q&A text matches the visible accordion 1:1.
 */
const FAQ_JSON_LD = {
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: FAQ_GROUPS.flatMap((group) =>
		group.items.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.a,
			},
		})),
	),
};

/**
 * /faq — STATIC, Lagoon design. The hero carries the single <h1>; sections
 * below use <h2>.
 */
export default function FAQPage() {
	return (
		<>
			{/* FAQPage structured data — server-side, in initial HTML */}
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
			/>
			{/* ── 1. Hero ────────────────────────────────────────────────────── */}
			<section
				aria-label='FAQ introduction'
				className='lagoon-grid-overlay bg-[var(--lagoon-canvas)] px-6 py-20 md:px-10 md:py-28'
			>
				<div className='mx-auto max-w-[1184px]'>
					<LagoonReveal>
						<p className='mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--lagoon-accent)]'>
							FAQ
						</p>
						<h1
							className='lagoon-section-title max-w-[22ch] text-[var(--lagoon-ink)]'
							style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
						>
							Every question, answered honestly.
						</h1>
						<p className='mt-5 max-w-[52ch] text-[17px] leading-[1.65] text-[var(--lagoon-body)]'>
							No glossy promises. Here&apos;s exactly what Budget Planner does,
							what it costs, and who it&apos;s built for.
						</p>
					</LagoonReveal>
				</div>
			</section>

			{/* ── 2. Grouped FAQ accordion ───────────────────────────────────── */}
			<section
				aria-label='Frequently asked questions'
				className='bg-[var(--lagoon-surface)] px-6 py-20 md:px-10 md:py-28'
			>
				<div className='mx-auto max-w-[820px]'>
					<LagoonReveal>
						<LagoonFaqAccordion />
					</LagoonReveal>
				</div>
			</section>

			{/* ── 3. "Still have questions?" ─────────────────────────────────── */}
			<section
				aria-label='Still have questions'
				className='bg-[var(--lagoon-canvas)] px-6 py-16 md:px-10 md:py-20'
			>
				<div className='mx-auto max-w-[820px]'>
					<LagoonReveal>
						<div className='rounded-2xl border border-[var(--lagoon-border)] bg-[var(--lagoon-surface)] px-8 py-10 text-center md:px-12'>
							<div
								className='mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl'
								style={{ background: 'var(--lagoon-accent-tint)' }}
								aria-hidden='true'
							>
								<svg
									width='22'
									height='22'
									viewBox='0 0 22 22'
									fill='none'
									aria-hidden='true'
									style={{ color: 'var(--lagoon-accent)' }}
								>
									<circle cx='11' cy='11' r='9' stroke='currentColor' strokeWidth='1.5' />
									<path
										d='M11 8.5v.01M11 11v4'
										stroke='currentColor'
										strokeWidth='1.5'
										strokeLinecap='round'
									/>
								</svg>
							</div>
							<h2
								className='mb-3 text-[22px] font-bold tracking-[-0.02em] text-[var(--lagoon-ink)]'
								style={{ fontFamily: 'var(--lagoon-font-heading, inherit)' }}
							>
								Still have questions?
							</h2>
							<p className='mx-auto max-w-[44ch] text-[15px] leading-[1.65] text-[var(--lagoon-body)]'>
								Check the public changelog and feature board — that&apos;s where
								development progress is tracked and where you can vote on
								what&apos;s coming next.
							</p>
							<div className='mt-7 flex flex-wrap items-center justify-center gap-3'>
								<Link
									href='/changelog'
									className='inline-flex h-10 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]'
									style={{ background: 'var(--lagoon-accent)' }}
								>
									View changelog
									<svg aria-hidden='true' width='13' height='13' viewBox='0 0 14 14' fill='none'>
										<path
											d='M2.5 7h9M8.5 4l3 3-3 3'
											stroke='currentColor'
											strokeWidth='1.5'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								</Link>
								<Link
									href='/register'
									className='inline-flex h-10 items-center rounded-full border border-[var(--lagoon-border)] px-6 text-[14px] font-semibold text-[var(--lagoon-body)] transition-colors hover:border-[var(--lagoon-border-soft)] hover:text-[var(--lagoon-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]'
								>
									Try it free
								</Link>
							</div>
						</div>
					</LagoonReveal>
				</div>
			</section>

			{/* ── 4. CTA ─────────────────────────────────────────────────────── */}
			<LagoonCTA />
		</>
	);
}
