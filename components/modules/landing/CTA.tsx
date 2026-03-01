import Link from 'next/link';

export function CTA() {
	return (
		<section className='bg-muted/50 py-24'>
			<div className='mx-auto max-w-6xl px-6 text-center'>
				<h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
					Ready to take control of your money?
				</h2>
				<p className='mt-4 text-muted-foreground'>
					Free to use. No credit card. No catch.
				</p>
				<Link
					href='/register'
					className='mt-8 inline-block rounded-full bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90'
				>
					Get Started Free
				</Link>
			</div>
		</section>
	);
}
