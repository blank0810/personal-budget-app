import Link from 'next/link';

export function CTA() {
	return (
		<section className='landing-reveal relative overflow-hidden py-24'>
			{/* Glow effect */}
			<div className='landing-glow absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 bg-primary/10' />

			<div className='relative mx-auto max-w-6xl px-6 text-center'>
				<h2 className='text-3xl font-bold text-white md:text-4xl'>
					Ready to take control?
				</h2>
				<p className='mt-4 text-white/50'>
					Join hundreds of people who stopped guessing and started
					tracking.
				</p>
				<Link
					href='/register'
					className='mt-8 inline-block rounded-full bg-white px-10 py-4 text-lg font-medium text-black transition-colors hover:bg-white/90'
				>
					Start tracking free
				</Link>
				<p className='mt-4 text-sm text-white/30'>
					Free forever. No credit card. Setup in 2 minutes.
				</p>
			</div>
		</section>
	);
}
