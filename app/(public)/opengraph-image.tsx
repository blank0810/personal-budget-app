import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Budget Planner — Know exactly where your money goes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Social share image — Lagoon brand palette (light canvas + teal accent).
 *
 * Design tokens matched to lagoon.css:
 *   canvas  #f8fafc  (--lagoon-canvas light)
 *   ink     #0f172a  (--lagoon-ink light)
 *   accent  #0d9488  (--lagoon-accent)
 *   muted   #64748b  (--lagoon-body light)
 *   border  #e2e8f0  (--lagoon-border light)
 *
 * Headline matches the home page <h1> verbatim ("Know exactly where your
 * money goes.") so the share card reinforces the LCP candidate copy.
 *
 * Honesty: no AI mention, no fabricated stats, no personal name/email.
 */
export default async function Image() {
	const dashboardBuffer = await readFile(
		join(process.cwd(), 'public', 'dashboard.png'),
	);
	const dashboardSrc = `data:image/png;base64,${dashboardBuffer.toString('base64')}`;

	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					backgroundColor: '#f8fafc',
					backgroundImage:
						'radial-gradient(circle at 8% 55%, rgba(13,148,136,0.09), transparent 52%), radial-gradient(circle at 88% 18%, rgba(13,148,136,0.05), transparent 48%)',
					color: '#0f172a',
					fontFamily: 'sans-serif',
					padding: '64px',
				}}
			>
				{/* Left column — wordmark + headline + badges */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						width: '52%',
						flexShrink: 0,
						gap: '20px',
					}}
				>
					{/* Wordmark */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
						<svg
							width='48'
							height='48'
							viewBox='0 0 24 24'
							fill='none'
							stroke='#0d9488'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						>
							<path d='M21 12V7H5a2 2 0 0 1 0-4h14v4' />
							<path d='M3 5v14a2 2 0 0 0 2 2h16v-5' />
							<path d='M18 12a2 2 0 0 0 0 4h4v-4Z' />
						</svg>
						<span style={{ fontSize: '34px', fontWeight: 600, letterSpacing: '-0.02em', color: '#0f172a' }}>
							Budget Planner
						</span>
					</div>

					{/* Headline — matches the home page h1 verbatim */}
					<div
						style={{
							fontSize: '58px',
							fontWeight: 700,
							lineHeight: 1.08,
							letterSpacing: '-0.03em',
							display: 'flex',
							flexDirection: 'column',
							color: '#0f172a',
						}}
					>
						<span>Know exactly</span>
						<span>where your</span>
						<span style={{ color: '#0d9488' }}>money goes.</span>
					</div>

					{/* Subline */}
					<div
						style={{
							fontSize: '22px',
							color: '#64748b',
							lineHeight: 1.4,
						}}
					>
						Free personal budgeting and expense tracking.
					</div>

					{/* Badges */}
					<div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '8px 18px',
								borderRadius: '999px',
								border: '1px solid #e2e8f0',
								backgroundColor: 'white',
								fontSize: '17px',
								color: '#475569',
							}}
						>
							Free forever
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '8px 18px',
								borderRadius: '999px',
								backgroundColor: '#0d9488',
								color: 'white',
								fontSize: '17px',
								fontWeight: 500,
							}}
						>
							budgetplanner.app
						</div>
					</div>
				</div>

				{/* Right column — dashboard preview */}
				<div
					style={{
						display: 'flex',
						width: '48%',
						alignItems: 'center',
						justifyContent: 'flex-end',
					}}
				>
					<img
						alt=''
						src={dashboardSrc}
						width={640}
						height={332}
						style={{
							borderRadius: '14px',
							border: '1px solid #e2e8f0',
							boxShadow: '0 20px 60px rgba(15,23,42,0.12)',
							transform: 'translateX(80px)',
						}}
					/>
				</div>
			</div>
		),
		{ ...size },
	);
}
