import { Rule } from '../Rule';
import { SectionHead } from '../SectionHead';

/**
 * A genuine three-step sequence, so it is numbered. Numbers appear once
 * on this site, here, because the order is information the reader needs
 * — not as a decorative marker above every section.
 */
const STEPS = [
	{
		title: 'Set up what you actually have',
		body: 'Add the accounts you really use — cash, bank, savings, credit, loans — and create envelopes for the categories you really spend on. About two minutes.',
	},
	{
		title: 'Log as you go, or import',
		body: 'Add transactions when they happen, or import a CSV you downloaded from your bank. The wizard flags likely duplicates before they land, and one undo rolls a whole import back.',
	},
	{
		title: 'Read the verdict',
		body: 'The dashboard grades the five pillars, states one score, and names the next thing to fix. It updates the moment you log, not overnight.',
	},
];

export function HomeMethod() {
	return (
		<section className='st-section' aria-labelledby='method-heading'>
			<div className='st-shell'>
				<div className='st-split'>
					<SectionHead id='method-heading' heading='You log it. You own it.'>
						<p>
							Budget Planner does not connect to your bank and never asks for
							your banking credentials. That is a deliberate trade: you do the
							logging, and in exchange nothing about your money passes through
							a third-party aggregator.
						</p>
					</SectionHead>

					<ol className='border-t' style={{ borderColor: 'var(--st-ink)' }}>
						{STEPS.map((step, i) => (
							<li
								key={step.title}
								className='grid gap-x-6 gap-y-2 border-b py-7 sm:grid-cols-[auto_minmax(0,1fr)]'
								style={{ borderColor: 'var(--st-rule)' }}
							>
								<span
									className='st-num text-[0.9375rem] font-semibold leading-none sm:pt-1'
									style={{ color: 'var(--st-signal)' }}
									aria-hidden='true'
								>
									{String(i + 1).padStart(2, '0')}
								</span>
								<div>
									<h3 className='st-h3'>{step.title}</h3>
									<p
										className='mt-2 text-[1rem] leading-relaxed'
										style={{ color: 'var(--st-body)', maxWidth: '58ch' }}
									>
										{step.body}
									</p>
								</div>
							</li>
						))}
					</ol>
				</div>

				<Rule className='mt-16' />
			</div>
		</section>
	);
}
