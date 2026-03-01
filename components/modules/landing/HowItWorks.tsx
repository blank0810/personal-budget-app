import { UserPlus, Settings, TrendingUp } from 'lucide-react';

const STEPS = [
	{
		number: '1',
		icon: UserPlus,
		title: 'Create your account',
		description:
			'Sign up in seconds. No credit card required — just your name, email, and password.',
	},
	{
		number: '2',
		icon: Settings,
		title: 'Set up your finances',
		description:
			'Add your accounts, set budgets by category, and configure recurring transactions.',
	},
	{
		number: '3',
		icon: TrendingUp,
		title: 'Start tracking',
		description:
			'Log transactions, monitor your budgets, and watch your financial health improve over time.',
	},
];

export function HowItWorks() {
	return (
		<section id='how-it-works' className='bg-muted/30 py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<h2 className='text-3xl font-bold tracking-tight md:text-4xl'>
						How it works.
					</h2>
					<p className='mt-3 text-muted-foreground'>
						Get started in under 2 minutes.
					</p>
				</div>

				<div className='relative mt-16'>
					{/* Dashed connector line — horizontal on desktop, vertical on mobile */}
					<div className='absolute left-1/2 top-12 hidden h-px w-2/3 -translate-x-1/2 border-t-2 border-dashed border-border md:block' />
					<div className='absolute left-8 top-0 h-full w-px border-l-2 border-dashed border-border md:hidden' />

					<div className='grid gap-12 md:grid-cols-3 md:gap-8'>
						{STEPS.map((step) => (
							<div
								key={step.number}
								className='relative pl-16 md:pl-0 md:text-center'
							>
								<span className='absolute left-0 top-0 text-4xl font-bold text-muted-foreground/20 md:static md:mb-4 md:block'>
									{step.number}
								</span>
								<div className='inline-flex rounded-md bg-background p-2.5 shadow-sm md:mx-auto'>
									<step.icon className='h-5 w-5' />
								</div>
								<h3 className='mt-3 font-semibold'>
									{step.title}
								</h3>
								<p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
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
