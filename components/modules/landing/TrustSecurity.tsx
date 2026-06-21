'use client';

import { Lock, ShieldOff, DownloadCloud, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from './ui/use-mounted';
import { SectionIndex } from './ui/SectionIndex';

/**
 * TrustSecurity (master IA §9).
 *
 * COMPOSITION (distinct, anti-uniformity): an ASYMMETRIC editorial trust
 * moment, NOT a symmetric 3-column grid. Left rail carries a large honest
 * statement (`.l-h2`) plus the "built in the open" line; the right rail is a
 * tight stack of hairline-separated trust ROWS (icon + claim + detail). The
 * two columns read as a 5/7 split on the near-black canvas.
 *
 * HONESTY (PRODUCT.md, hard gate): only TRUE claims, namely encrypted and
 * private data, no ads / no data selling, export and delete anytime, built in
 * the open by a solo founder. No "bank-level", no SOC 2, no unverifiable badges.
 *
 * Motion: left rises from y, right rows stagger in; single useReducedMotion()
 * gate collapses both to a plain fade. viewport once.
 */
const TRUST_ROWS: {
	icon: LucideIcon;
	title: string;
	body: string;
}[] = [
	{
		icon: Lock,
		title: 'Your data is encrypted and private',
		body: 'Your connection is encrypted, and your password is scrambled, never stored in plain text.',
	},
	{
		icon: ShieldOff,
		title: 'We never sell your data or run ads',
		body: 'Your finances are not a product. No ad trackers, no brokers, no sharing of your numbers.',
	},
	{
		icon: DownloadCloud,
		title: 'Export or delete everything, anytime',
		body: 'Your records are yours. Export them whenever you like, or delete your account and all of it.',
	},
];

export function TrustSecurity() {
	const prefersReduced = useReducedMotion();
	const mounted = useMounted();

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

	const stagger: Variants = {
		hidden: {},
		visible: {
			transition: { staggerChildren: (mounted && prefersReduced) ? 0 : 0.1 },
		},
	};

	const row: Variants = (mounted && prefersReduced)
		? {
				hidden: { opacity: 0 },
				visible: { opacity: 1, transition: { duration: 0.3 } },
		  }
		: {
				hidden: { opacity: 0, y: 16 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
				},
		  };

	return (
		<section className='py-24 sm:py-28'>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10 xl:px-12'>
				<div className='grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-12'>
					{/* Left rail: the honest statement + founder line */}
					<m.div
						variants={fromLeft}
						initial='hidden'
						whileInView='visible'
						viewport={{ once: true, amount: 0.4 }}
						className='lg:col-span-5'
					>
						<SectionIndex index='04' label='Trust and security' />
						<h2 className='l-h2 mt-5'>
							Your money data
							<br className='hidden sm:block' /> stays yours.
						</h2>
						<p className='mt-6 max-w-md text-base leading-relaxed text-l-text-2 sm:text-lg'>
							No dark patterns, no hidden data deals. The promises
							below are the whole list, and every one of them is
							something the app actually does today.
						</p>

						<div className='mt-9 flex items-start gap-3 border-t border-l-border pt-7'>
							<GitBranch
								className='mt-0.5 h-5 w-5 shrink-0 text-l-accent'
								aria-hidden='true'
							/>
							<p className='text-sm leading-relaxed text-l-text-2'>
								Built in the open by a solo founder. Progress is
								public on the changelog and the roadmap is shaped by
								the community feature board, so you can see exactly
								what is shipping and what is next.
							</p>
						</div>
					</m.div>

					{/* Right rail: tight hairline-separated trust rows */}
					<m.div
						variants={stagger}
						initial='hidden'
						whileInView='visible'
						viewport={{ once: true, amount: 0.3 }}
						className='lg:col-span-7 lg:pt-2'
					>
						<div className='divide-y divide-l-border rounded-2xl border border-l-border bg-l-surface-1'>
							{TRUST_ROWS.map(({ icon: Icon, title, body }) => (
								<m.div
									key={title}
									variants={row}
									className='flex items-start gap-4 p-6 sm:p-7'
								>
									<span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-l-accent-dim text-l-accent'>
										<Icon
											className='h-5 w-5'
											aria-hidden='true'
										/>
									</span>
									<div className='min-w-0'>
										<h3 className='text-base font-semibold tracking-[-0.01em] text-l-text-1'>
											{title}
										</h3>
										<p className='mt-1.5 text-sm leading-relaxed text-l-text-2'>
											{body}
										</p>
									</div>
								</m.div>
							))}
						</div>
					</m.div>
				</div>
			</div>
		</section>
	);
}
