import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Budget Planner — Track income, expenses, and budgets';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
					backgroundColor: '#000000',
					backgroundImage:
						'radial-gradient(circle at 20% 0%, rgba(99,102,241,0.25), transparent 55%), radial-gradient(circle at 90% 100%, rgba(59,130,246,0.18), transparent 50%)',
					color: 'white',
					fontFamily: 'sans-serif',
					padding: '64px',
				}}
			>
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
					<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
						<svg
							width='52'
							height='52'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
						>
							<path d='M21 12V7H5a2 2 0 0 1 0-4h14v4' />
							<path d='M3 5v14a2 2 0 0 0 2 2h16v-5' />
							<path d='M18 12a2 2 0 0 0 0 4h4v-4Z' />
						</svg>
						<span style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.02em' }}>
							Budget Planner
						</span>
					</div>

					<div
						style={{
							fontSize: '64px',
							fontWeight: 700,
							lineHeight: 1.05,
							letterSpacing: '-0.03em',
							display: 'flex',
							flexDirection: 'column',
						}}
					>
						<span>Stop guessing</span>
						<span style={{ color: 'rgba(255,255,255,0.7)' }}>where your money goes.</span>
					</div>

					<div
						style={{
							fontSize: '24px',
							color: 'rgba(255,255,255,0.6)',
							lineHeight: 1.4,
						}}
					>
						Track income, expenses, and budgets — all in one free app.
					</div>

					<div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '8px 18px',
								borderRadius: '999px',
								border: '1px solid rgba(255,255,255,0.2)',
								fontSize: '18px',
								color: 'rgba(255,255,255,0.85)',
							}}
						>
							Free to use
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '8px 18px',
								borderRadius: '999px',
								background: 'white',
								color: 'black',
								fontSize: '18px',
								fontWeight: 500,
							}}
						>
							budgetplanner.app
						</div>
					</div>
				</div>

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
							border: '1px solid rgba(255,255,255,0.1)',
							boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
							transform: 'translateX(80px)',
						}}
					/>
				</div>
			</div>
		),
		{ ...size },
	);
}
