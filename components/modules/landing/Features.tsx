import {
	LayoutDashboard,
	PiggyBank,
	Target,
	Repeat,
	BarChart3,
	Upload,
} from 'lucide-react';

const FEATURES = [
	{
		icon: LayoutDashboard,
		title: 'Smart Dashboard',
		description:
			'See your complete financial picture at a glance with a 5-pillar health score, income vs. expense trends, and budget progress.',
	},
	{
		icon: PiggyBank,
		title: 'Envelope Budgets',
		description:
			'Set monthly budgets by category and track spending in real time. Know exactly where your money goes.',
	},
	{
		icon: Target,
		title: 'Savings Goals',
		description:
			'Set targets, track contributions, and watch your progress. Link goals to accounts for automatic tracking.',
	},
	{
		icon: Repeat,
		title: 'Recurring Transactions',
		description:
			'Automate your regular income and expenses. Set it once and never forget a bill again.',
	},
	{
		icon: BarChart3,
		title: 'Financial Reports',
		description:
			'Monthly summaries delivered to your inbox with charts, trends, and actionable insights. Export to PDF.',
	},
	{
		icon: Upload,
		title: 'CSV Import',
		description:
			'Import transactions from your bank with smart column mapping, duplicate detection, and one-click undo.',
	},
];

export function Features() {
	return (
		<section id='features' className='py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<h2 className='text-center text-3xl font-bold tracking-tight md:text-4xl'>
					Everything you need to take control of your money.
				</h2>

				<div className='mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
					{FEATURES.map((feature) => (
						<div
							key={feature.title}
							className='rounded-lg border bg-card p-6'
						>
							<div className='inline-flex rounded-md bg-muted p-2'>
								<feature.icon className='h-5 w-5 text-foreground' />
							</div>
							<h3 className='mt-4 font-semibold'>
								{feature.title}
							</h3>
							<p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
