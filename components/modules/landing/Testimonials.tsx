import { Star } from 'lucide-react';

const TESTIMONIALS = [
	{
		quote: 'I finally stopped dreading the end of the month. Seeing where every peso goes changed how I spend.',
		name: 'Maria S.',
		role: 'Freelance Designer',
	},
	{
		quote: 'The budget envelopes are a game changer. I paid off my credit card in 3 months.',
		name: 'James R.',
		role: 'Software Engineer',
	},
	{
		quote: "Simple, fast, and actually useful. I tried YNAB and Mint \u2014 this is the one that stuck.",
		name: 'Anna L.',
		role: 'Small Business Owner',
	},
];

export function Testimonials() {
	return (
		<section className='landing-reveal py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<p className='text-xs font-medium uppercase tracking-widest text-primary/80'>
						What users say
					</p>
					<h2 className='mt-3 text-3xl font-bold text-white md:text-4xl'>
						Trusted by people who take their finances seriously.
					</h2>
				</div>

				<div className='landing-stagger mt-14 grid gap-4 md:grid-cols-3'>
					{TESTIMONIALS.map((t) => (
						<div
							key={t.name}
							className='landing-reveal rounded-xl border border-white/[0.06] bg-white/[0.03] p-6'
						>
							<div className='flex gap-0.5'>
								{Array.from({ length: 5 }).map((_, i) => (
									<Star
										key={i}
										className='h-3.5 w-3.5 fill-amber-400/80 text-amber-400/80'
									/>
								))}
							</div>
							<p className='mt-4 text-sm leading-relaxed text-white/70 italic'>
								&ldquo;{t.quote}&rdquo;
							</p>
							<div className='mt-4'>
								<p className='text-sm font-medium text-white'>
									{t.name}
								</p>
								<p className='text-xs text-white/40'>
									{t.role}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Trust bar */}
				<div className='mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-white/30'>
					<span>Free forever for personal use</span>
					<span className='hidden sm:inline'>&middot;</span>
					<span>Bank-level encryption</span>
					<span className='hidden sm:inline'>&middot;</span>
					<span>No ads, no data selling</span>
				</div>
			</div>
		</section>
	);
}
