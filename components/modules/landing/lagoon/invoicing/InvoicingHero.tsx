'use client';

import Link from 'next/link';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useMounted } from '@/components/modules/landing/ui/use-mounted';

/**
 * Invoice rows for the browser mock — grounded in the real invoice module:
 * clientName, amount, status (DRAFT | SENT | PAID | OVERDUE | CANCELLED),
 * dueDate. No fabricated company names that could be personal.
 */
const INVOICE_ROWS = [
	{
		number: '#INV-0044',
		client: 'Acme Co',
		desc: 'Website audit · June',
		amount: '₱25,000',
		status: 'Overdue' as const,
	},
	{
		number: '#INV-0043',
		client: 'Delta Corp',
		desc: 'Design retainer · June',
		amount: '₱45,000',
		status: 'Sent' as const,
	},
	{
		number: '#INV-0042',
		client: 'Bright Studio',
		desc: 'Branding project · Q1',
		amount: '₱60,000',
		status: 'Paid' as const,
	},
	{
		number: '#INV-0041',
		client: 'Acme Co',
		desc: 'Dev retainer · May',
		amount: '₱38,000',
		status: 'Paid' as const,
	},
] as const;

type InvoiceStatus = 'Overdue' | 'Sent' | 'Paid';

const STATUS_CLASSES: Record<InvoiceStatus, { className: string; style?: React.CSSProperties }> = {
	Overdue: { className: 'rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-red-500/10 text-red-600' },
	Sent: {
		className: 'rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
		style: { background: 'var(--lagoon-accent-bg)', color: 'var(--lagoon-accent-strong)' },
	},
	Paid: { className: 'rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-green-500/10 text-green-600' },
};

/**
 * Browser mock — shows the real /invoices list UI.
 * aria-hidden: decorative, real screen-reader context is in the text column.
 */
function InvoiceBrowserMock() {
	return (
		<div className='lagoon-browser w-full select-none text-left' aria-hidden='true'>
			{/* Chrome bar */}
			<div
				className='flex items-center gap-3 border-b border-[var(--lagoon-border)] px-4 py-2.5'
				style={{ background: 'var(--lagoon-canvas)' }}
			>
				<div className='flex items-center gap-1.5'>
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#ff5f57' }} />
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#febc2e' }} />
					<span className='inline-block h-3 w-3 rounded-full' style={{ background: '#28c840' }} />
				</div>
				<div className='flex flex-1 justify-center'>
					<div
						className='flex w-[240px] max-w-full items-center gap-1.5 rounded-md border border-[var(--lagoon-border)] px-3 py-1'
						style={{ background: 'var(--lagoon-surface)' }}
					>
						<svg viewBox='0 0 16 16' fill='none' className='h-3 w-3 shrink-0' style={{ color: 'var(--lagoon-muted)' }}>
							<path
								d='M11.5 7V5.5a3.5 3.5 0 0 0-7 0V7M3 7h10a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z'
								stroke='currentColor'
								strokeWidth='1.2'
								strokeLinecap='round'
							/>
						</svg>
						<span className='truncate text-[11px]' style={{ color: 'var(--lagoon-muted)' }}>
							budget.umbra.build/invoices
						</span>
					</div>
				</div>
			</div>

			{/* Page content */}
			<div className='p-4' style={{ background: 'var(--lagoon-surface)' }}>
				{/* Page header */}
				<div className='mb-3 flex items-center justify-between'>
					<p
						className='text-[13px] font-semibold'
						style={{ color: 'var(--lagoon-ink)', fontFamily: 'var(--lagoon-font-heading, inherit)' }}
					>
						Invoices
					</p>
					<span
						className='flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold text-white'
						style={{ background: 'var(--lagoon-accent)' }}
					>
						<svg viewBox='0 0 12 12' fill='none' className='h-2.5 w-2.5'>
							<path d='M6 2v8M2 6h8' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
						</svg>
						New Invoice
					</span>
				</div>

				{/* Status filter tabs */}
				<div className='mb-3 flex flex-wrap gap-1.5'>
					{(
						[
							{ label: 'All · 4', active: true },
							{ label: 'Sent · 1', active: false },
							{ label: 'Paid · 2', active: false },
							{ label: 'Overdue · 1', active: false },
						] as const
					).map(({ label, active }) => (
						<span
							key={label}
							className='rounded-md px-2 py-0.5 text-[10px] font-medium'
							style={
								active
									? {
											background: 'var(--lagoon-accent-bg)',
											color: 'var(--lagoon-accent-strong)',
											border: '1px solid var(--lagoon-accent-border)',
										}
									: { background: 'var(--lagoon-surface-2)', color: 'var(--lagoon-muted)' }
							}
						>
							{label}
						</span>
					))}
				</div>

				{/* Column headers */}
				<div
					className='mb-1.5 flex border-b pb-1.5'
					style={{ borderColor: 'var(--lagoon-border)' }}
				>
					<span className='flex-1 text-[10px] font-medium' style={{ color: 'var(--lagoon-muted)' }}>
						Invoice &amp; Client
					</span>
					<span className='w-[60px] text-right text-[10px] font-medium' style={{ color: 'var(--lagoon-muted)' }}>
						Amount
					</span>
					<span className='ml-2 w-[52px] text-right text-[10px] font-medium' style={{ color: 'var(--lagoon-muted)' }}>
						Status
					</span>
				</div>

				{/* Invoice rows */}
				<div className='space-y-2.5 pt-0.5'>
					{INVOICE_ROWS.map((row) => {
						const { className: badgeCn, style: badgeStyle } = STATUS_CLASSES[row.status];
						return (
							<div key={row.number} className='flex items-center gap-2'>
								{/* Left: invoice number + client + description */}
								<div className='min-w-0 flex-1'>
									<div className='flex items-center gap-1.5'>
										<span
											className='font-mono text-[11px] font-semibold'
											style={{ color: 'var(--lagoon-ink)' }}
										>
											{row.number}
										</span>
										<span
											className='shrink-0 rounded border px-1 text-[9px]'
											style={{ borderColor: 'var(--lagoon-border)', color: 'var(--lagoon-muted)' }}
										>
											{row.client}
										</span>
									</div>
									<p className='mt-0.5 truncate text-[10px]' style={{ color: 'var(--lagoon-muted)' }}>
										{row.desc}
									</p>
								</div>
								{/* Amount */}
								<span
									className='w-[60px] shrink-0 text-right font-mono text-[11px] font-semibold'
									style={{ color: 'var(--lagoon-ink)' }}
								>
									{row.amount}
								</span>
								{/* Status badge */}
								<span className={`ml-2 w-[52px] shrink-0 text-center ${badgeCn}`} style={badgeStyle}>
									{row.status}
								</span>
							</div>
						);
					})}
				</div>

				{/* PDF / email hint strip */}
				<div
					className='mt-4 flex items-center gap-2 rounded-lg border px-3 py-2'
					style={{ borderColor: 'var(--lagoon-border)', background: 'var(--lagoon-surface-2)' }}
				>
					<svg
						viewBox='0 0 16 16'
						fill='none'
						className='h-3.5 w-3.5 shrink-0'
						style={{ color: 'var(--lagoon-accent)' }}
					>
						<path
							d='M4 2h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM10 2v3h3'
							stroke='currentColor'
							strokeWidth='1.2'
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>
					<span className='flex-1 text-[10px]' style={{ color: 'var(--lagoon-body)' }}>
						Export PDF &middot; Email to client &middot; Share payment link &amp; QR
					</span>
					<span
						className='shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold'
						style={{
							borderColor: 'var(--lagoon-accent-border)',
							background: 'var(--lagoon-accent-bg)',
							color: 'var(--lagoon-accent-strong)',
						}}
					>
						PDF
					</span>
				</div>
			</div>
		</div>
	);
}

/**
 * InvoicingHero — above-fold section for /invoicing.
 *
 * LCP h1 is plain SSR (never inside a motion wrapper).
 * Badge, subhead, CTAs, trust strip, and mock all entrance-animate
 * after mount — gated behind useMounted() so SSR sees opacity:1.
 */
export function InvoicingHero() {
	const mounted = useMounted();
	const prefersReduced = useReducedMotion();
	const shouldAnimate = mounted && !prefersReduced;

	const enter = (fromY: number, delay: number): Variants =>
		!shouldAnimate
			? { hidden: { y: 0, opacity: 1 }, visible: { y: 0, opacity: 1 } }
			: {
					hidden: { y: fromY, opacity: 0 },
					visible: {
						y: 0,
						opacity: 1,
						transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] },
					},
				};

	return (
		<section
			className='lagoon-grid-overlay relative overflow-hidden pb-16 pt-[128px] md:pb-24 md:pt-[160px]'
			style={{ background: 'var(--lagoon-canvas)' }}
			aria-label='Invoicing hero'
		>
			<div className='lagoon-hero-glow' aria-hidden='true' />

			<div className='relative z-10 mx-auto max-w-[1184px] px-6 text-center md:px-10'>
				{/* Badge */}
				<m.div
					variants={enter(-10, 0)}
					initial='hidden'
					animate='visible'
					className='inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]'
					style={{
						borderColor: 'var(--lagoon-accent-border)',
						background: 'var(--lagoon-accent-bg)',
						color: 'var(--lagoon-accent-strong)',
					}}
				>
					<span
						aria-hidden='true'
						className='h-1.5 w-1.5 rounded-full'
						style={{ background: 'var(--lagoon-accent)' }}
					/>
					Invoicing &middot; Shipped
				</m.div>

				{/* LCP h1 — plain SSR, always visible, never animated */}
				<h1
					className='lagoon-hero-title mx-auto mt-6 max-w-[860px]'
					style={{
						color: 'var(--lagoon-ink)',
						fontFamily: 'var(--lagoon-font-heading, inherit)',
					}}
				>
					Send invoices, get paid —{' '}
					<span style={{ color: 'var(--lagoon-accent)' }}>without a second tool</span>
				</h1>

				{/* Subhead */}
				<m.p
					variants={enter(12, 0.1)}
					initial='hidden'
					animate='visible'
					className='mx-auto mt-6 max-w-[52ch] text-[17px] leading-[1.7] md:mt-7'
					style={{ color: 'var(--lagoon-body)' }}
				>
					Create a polished invoice, email it to your client, and share a
					payment link or QR code — all from the same app where you track
					your budget.
				</m.p>

				{/* CTAs */}
				<m.div
					variants={enter(12, 0.18)}
					initial='hidden'
					animate='visible'
					className='mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10'
				>
					<Link
						href='/register'
						className='inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'
						style={{ background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' }}
						onMouseEnter={(e) =>
							((e.currentTarget as HTMLElement).style.background =
								'var(--lagoon-accent-strong)')
						}
						onMouseLeave={(e) =>
							((e.currentTarget as HTMLElement).style.background = 'var(--lagoon-accent)')
						}
					>
						Start for free
						<svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14' fill='none'>
							<path
								d='M2.5 7h9M8.5 4l3 3-3 3'
								stroke='currentColor'
								strokeWidth='1.5'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</Link>
					<a
						href='#features'
						className='inline-flex h-12 items-center rounded-full border px-8 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2'
						style={{
							borderColor: 'var(--lagoon-border)',
							background: 'var(--lagoon-surface)',
							color: 'var(--lagoon-body)',
						}}
						onMouseEnter={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor =
								'var(--lagoon-border-soft)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-ink)';
						}}
						onMouseLeave={(e) => {
							(e.currentTarget as HTMLElement).style.borderColor = 'var(--lagoon-border)';
							(e.currentTarget as HTMLElement).style.color = 'var(--lagoon-body)';
						}}
					>
						See what&apos;s included
					</a>
				</m.div>

				{/* Trust strip */}
				<m.p
					variants={enter(0, 0.26)}
					initial='hidden'
					animate='visible'
					className='mt-5 text-[13px]'
					style={{ color: 'var(--lagoon-muted)' }}
				>
					No credit card&ensp;&middot;&ensp;PDF export included&ensp;&middot;&ensp;Free forever for personal use
				</m.p>

				{/* Invoice browser mock */}
				<m.div
					variants={enter(28, 0.38)}
					initial='hidden'
					animate='visible'
					className='mx-auto mt-14 max-w-[720px] md:mt-16'
				>
					<InvoiceBrowserMock />
				</m.div>
			</div>
		</section>
	);
}
