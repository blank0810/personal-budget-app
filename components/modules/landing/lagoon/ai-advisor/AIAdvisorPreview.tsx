import { LagoonReveal } from '@/components/modules/landing/lagoon/LagoonReveal';

/**
 * AIAdvisorPreview — concept mock chat + transparency note for /ai-advisor.
 *
 * HONESTY (hard gate — non-negotiable):
 * - The mock is a STATIC, non-interactive concept preview.
 * - The header, disclaimer, and footnote all state "concept" / "scripted" / "not yet built".
 * - No claim that these responses come from a live model.
 * - Every message is framed as "how it is designed to work".
 *
 * Numbers used in the chat are internally consistent (same data month):
 *   Income ₱64,200 · Spending ₱38,910 · Food budget 76% used · cushion ₱25,290.
 *
 * Server component — fully static.
 */

const CHAT = [
	{
		role: 'ai' as const,
		text: 'Hi there. Ask me anything about this month and I will answer from your numbers.',
	},
	{
		role: 'user' as const,
		text: 'Where am I overspending?',
	},
	{
		role: 'ai' as const,
		text: 'Food & Dining is the one to watch — at 76% of its budget with a week left. Everything else has room. Your total spending is ₱38,910 against ₱64,200 of income this month.',
	},
	{
		role: 'user' as const,
		text: 'Can I afford a ₱15,000 purchase?',
	},
	{
		role: 'ai' as const,
		text: 'Yes, with room to spare. You are ₱25,290 ahead this month. A ₱15,000 purchase still leaves ₱10,290 of cushion — just keep Food & Dining from tipping past its limit.',
	},
] as const;

export function AIAdvisorPreview() {
	return (
		<section
			aria-label='AI advisor concept preview'
			className='py-20 md:py-28'
			style={{ background: 'var(--lagoon-canvas)' }}
		>
			<div className='mx-auto max-w-[1184px] px-6 md:px-10'>
				<LagoonReveal>
					{/* Outer container — teal-tinted panel, same as FeatureRowAI */}
					<div
						className='overflow-hidden rounded-2xl border'
						style={{
							borderColor: 'var(--lagoon-accent-border)',
							background:
								'linear-gradient(135deg, var(--lagoon-accent-bg) 0%, var(--lagoon-canvas) 60%)',
						}}
					>
						<div className='grid items-start gap-8 p-8 md:grid-cols-2 md:gap-14 md:p-12'>
							{/* Left — copy */}
							<div>
								<div className='mb-3 flex flex-wrap items-center gap-2'>
									<p
										className='text-[12px] font-semibold uppercase tracking-[0.12em]'
										style={{ color: 'var(--lagoon-accent)' }}
									>
										Concept preview
									</p>
									<span
										className='rounded-full border px-2.5 py-0.5 text-[10px] font-semibold'
										style={{
											borderColor: 'var(--lagoon-border)',
											background: 'var(--lagoon-surface)',
											color: 'var(--lagoon-ink-3)',
										}}
									>
										Not yet built
									</span>
								</div>
								<h2
									className='lagoon-section-title mb-4'
									style={{
										color: 'var(--lagoon-ink)',
										fontFamily: 'var(--lagoon-font-heading, inherit)',
									}}
								>
									A scripted glimpse of where it is headed.
								</h2>
								<p
									className='mb-4 text-[17px] leading-[1.7]'
									style={{ color: 'var(--lagoon-body)' }}
								>
									The chat on the right shows how the AI advisor is designed to
									feel — answering questions from real budget data rather than
									returning generic suggestions. The exchanges are scripted; no
									live model is running.
								</p>
								<p
									className='text-[14px] italic leading-[1.7]'
									style={{ color: 'var(--lagoon-muted)' }}
								>
									When the advisor ships, free-text questions will replace
									these scripts and the answers will come from your own data.
									We will announce it in the{' '}
									<a
										href='/changelog'
										className='underline underline-offset-2 transition-colors hover:opacity-80'
										style={{ color: 'var(--lagoon-accent)' }}
									>
										changelog
									</a>
									.
								</p>
							</div>

							{/* Right — static chat mock */}
							<div
								className='rounded-xl border'
								style={{
									borderColor: 'var(--lagoon-border)',
									background: 'var(--lagoon-surface)',
								}}
								aria-label='Concept chat preview — scripted, not a live feature'
							>
								{/* Chat header */}
								<div
									className='flex items-center justify-between border-b px-4 py-3'
									style={{ borderColor: 'var(--lagoon-border)' }}
								>
									<div className='flex items-center gap-2.5'>
										<div
											className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
											style={{ background: 'var(--lagoon-accent-tint)' }}
										>
											<svg
												viewBox='0 0 16 16'
												fill='none'
												className='h-4 w-4'
												aria-hidden='true'
											>
												<path
													d='M8 2a6 6 0 0 1 4 10.5l1 2-2.5-1A6 6 0 1 1 8 2Z'
													stroke='var(--lagoon-accent)'
													strokeWidth='1.2'
													fill='none'
												/>
												<path
													d='M5.5 7.5h5M5.5 9.5h3'
													stroke='var(--lagoon-accent)'
													strokeWidth='1.2'
													strokeLinecap='round'
												/>
											</svg>
										</div>
										<div>
											<p
												className='text-[12px] font-semibold'
												style={{ color: 'var(--lagoon-ink)' }}
											>
												AI Budget Advisor
											</p>
											<p
												className='text-[10px]'
												style={{ color: 'var(--lagoon-muted)' }}
											>
												Based on your own data
											</p>
										</div>
									</div>
									{/* Status pill */}
									<span
										className='rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em]'
										style={{
											borderColor: 'var(--lagoon-border)',
											color: 'var(--lagoon-muted)',
										}}
									>
										Concept
									</span>
								</div>

								{/* Honesty disclaimer — above the chat bubbles */}
								<p
									className='border-b px-4 py-2 text-[11px] leading-snug'
									style={{
										borderColor: 'var(--lagoon-border)',
										color: 'var(--lagoon-muted)',
									}}
								>
									Scripted preview — these replies are not from a live model.
								</p>

								{/* Chat bubbles — static */}
								<div className='space-y-3 px-4 py-4'>
									{CHAT.map((msg, i) => {
										const isUser = msg.role === 'user';
										return (
											<div
												key={i}
												className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
											>
												<div
													className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
														isUser
															? 'rounded-br-sm text-white'
															: 'rounded-bl-sm'
													}`}
													style={
														isUser
															? { background: 'var(--lagoon-accent)' }
															: {
																	background: 'var(--lagoon-surface-2)',
																	color: 'var(--lagoon-body)',
																}
													}
												>
													{msg.text}
												</div>
											</div>
										);
									})}
								</div>

								{/* Inert input — clearly non-functional */}
								<div className='px-4 pb-4'>
									<div
										className='flex select-none items-center gap-2 rounded-xl border px-3 py-2.5'
										style={{
											borderColor: 'var(--lagoon-border)',
											background: 'var(--lagoon-surface-2)',
										}}
										aria-hidden='true'
									>
										<span
											className='flex-1 text-[12px]'
											style={{ color: 'var(--lagoon-muted)' }}
										>
											Free-text chat opens when the AI advisor ships
										</span>
										<div
											className='flex h-6 w-6 items-center justify-center rounded-full'
											style={{ background: 'var(--lagoon-accent-tint)' }}
										>
											<svg
												viewBox='0 0 12 12'
												fill='none'
												className='h-3 w-3'
												aria-hidden='true'
											>
												<path
													d='M2 6h8M7 3.5l2.5 2.5L7 8.5'
													stroke='var(--lagoon-accent)'
													strokeWidth='1.2'
													strokeLinecap='round'
													strokeLinejoin='round'
												/>
											</svg>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</LagoonReveal>
			</div>
		</section>
	);
}
