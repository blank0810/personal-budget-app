import Link from 'next/link';
import { ScoreReading } from '../ScoreReading';

/**
 * HomeHero — the page's opening statement.
 *
 * The h1 is plain server-rendered type and is never animated: it is the
 * LCP element. The one moving thing above the fold is the score
 * instrument in the right column, which settles once on load.
 *
 * Not a centred hero. No announcement badge, no radial glow, no browser
 * chrome floating on a gradient — the composition is a headline and a
 * reading, side by side, the way the product presents a verdict.
 */
export function HomeHero() {
	return (
		<section
			className='border-b pb-[clamp(3rem,6vw,5rem)] pt-[clamp(3.5rem,7vw,6rem)]'
			style={{ borderColor: 'var(--st-rule)' }}
			aria-label='Introduction'
		>
			<div className='st-shell'>
				<div className='grid items-start gap-[clamp(2.5rem,5vw,4.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]'>
					<div>
						<h1 className='st-display max-w-[15ch]'>
							Your money has a number. You just haven&rsquo;t seen it.
						</h1>

						<p className='st-lead mt-7' style={{ color: 'var(--st-body)' }}>
							Log what you earn and spend. Budget Planner grades five pillars of
							your finances and returns one score out of 100 &mdash; built from
							what you actually recorded, not guessed from a bank feed.
						</p>

						<div className='mt-9 flex flex-wrap gap-3'>
							<Link href='/register' className='st-btn st-btn--signal st-btn--lg'>
								Start for free
							</Link>
							<Link
								href='/how-it-works'
								className='st-btn st-btn--ghost st-btn--lg'
							>
								See how it works
							</Link>
						</div>

						<ul
							className='mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem]'
							style={{ color: 'var(--st-muted)' }}
						>
							<li>No bank linking</li>
							<li>Free to start</li>
							<li>First score in minutes</li>
						</ul>
					</div>

					<div
						className='border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1'
						style={{ borderColor: 'var(--st-rule)' }}
					>
						<ScoreReading />
					</div>
				</div>
			</div>
		</section>
	);
}
