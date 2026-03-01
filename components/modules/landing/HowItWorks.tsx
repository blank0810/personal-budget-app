import { UserPlus, Settings, TrendingUp } from 'lucide-react';

const STEPS = [
	{
		number: '01',
		icon: UserPlus,
		title: 'Create your free account',
		description:
			'No credit card. Just your name and email. You\u2019re tracking in under a minute.',
	},
	{
		number: '02',
		icon: Settings,
		title: 'Set up your finances',
		description:
			'Add accounts, set category budgets, pick your currency. Import past transactions via CSV.',
	},
	{
		number: '03',
		icon: TrendingUp,
		title: 'Watch your wealth grow',
		description:
			'Track every peso, hit your goals, and build real habits. Monthly reports keep you on track.',
	},
];

export function HowItWorks() {
	return (
		<section
			id='how-it-works'
			className='landing-reveal border-y border-white/[0.06] bg-white/[0.02] py-24'
		>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<p className='text-xs font-medium uppercase tracking-widest text-primary/80'>
						How it works
					</p>
					<h2 className='mt-3 text-3xl font-bold text-white md:text-4xl'>
						Up and running in 2 minutes.
					</h2>
				</div>

				<div className='relative mt-16'>
					{/* Dashed connector — horizontal on desktop */}
					<div className='absolute left-[16.67%] right-[16.67%] top-12 hidden h-px border-t-2 border-dashed border-white/10 md:block' />
					{/* Dashed connector — vertical on mobile */}
					<div className='absolute left-8 top-0 h-full w-px border-l-2 border-dashed border-white/10 md:hidden' />

					<div className='landing-stagger grid gap-12 md:grid-cols-3 md:gap-8'>
						{STEPS.map((step) => (
							<div
								key={step.number}
								className='landing-reveal relative pl-16 md:pl-0 md:text-center'
							>
								<span className='absolute left-0 top-0 text-5xl font-bold text-white/[0.07] md:static md:mb-4 md:block'>
									{step.number}
								</span>
								<div className='inline-flex rounded-lg bg-white/[0.06] p-2.5 md:mx-auto'>
									<step.icon className='h-5 w-5 text-white/70' />
								</div>
								<h3 className='mt-3 font-semibold text-white'>
									{step.title}
								</h3>
								<p className='mt-2 text-sm leading-relaxed text-white/50'>
									{step.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
