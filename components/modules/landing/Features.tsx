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
		span: 'md:col-span-2',
		visual: (
			<div className='mt-4 flex items-end gap-1.5'>
				{[40, 56, 35, 62, 48, 70, 52].map((h, i) => (
					<div
						key={i}
						className='flex-1 rounded-t bg-emerald-500/30'
						style={{ height: `${h}px` }}
					/>
				))}
			</div>
		),
	},
	{
		icon: PiggyBank,
		title: 'Envelope Budgets',
		description:
			'Set monthly budgets by category and track spending in real time. Know exactly where your money goes.',
		span: '',
		visual: null,
	},
	{
		icon: Target,
		title: 'Savings Goals',
		description:
			'Set targets, track contributions, and watch your progress. Link goals to accounts for automatic tracking.',
		span: '',
		visual: null,
	},
	{
		icon: Repeat,
		title: 'Recurring Transactions',
		description:
			'Automate your regular income and expenses. Set it once and never forget a bill again.',
		span: '',
		visual: null,
	},
	{
		icon: BarChart3,
		title: 'Financial Reports',
		description:
			'Monthly summaries delivered to your inbox with charts, trends, and actionable insights. Export to PDF.',
		span: 'md:col-span-2',
		visual: (
			<div className='mt-4 space-y-2'>
				{[
					{ label: 'Income', pct: 100, color: 'bg-emerald-500/40' },
					{ label: 'Expenses', pct: 62, color: 'bg-white/10' },
					{ label: 'Savings', pct: 38, color: 'bg-primary/40' },
				].map((bar) => (
					<div key={bar.label} className='flex items-center gap-3'>
						<span className='w-16 text-[10px] text-white/40'>
							{bar.label}
						</span>
						<div className='h-1.5 flex-1 rounded-full bg-white/[0.06]'>
							<div
								className={`h-1.5 rounded-full ${bar.color}`}
								style={{ width: `${bar.pct}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		),
	},
	{
		icon: Upload,
		title: 'CSV Import',
		description:
			'Import transactions from your bank with smart column mapping, duplicate detection, and one-click undo.',
		span: '',
		visual: null,
	},
];

export function Features() {
	return (
		<section id='features' className='landing-reveal py-24'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<p className='text-xs font-medium uppercase tracking-widest text-primary/80'>
						Features
					</p>
					<h2 className='mt-3 text-3xl font-bold text-white md:text-4xl'>
						Everything you need, nothing you don&apos;t.
					</h2>
				</div>

				<div className='landing-stagger mt-14 grid gap-4 md:grid-cols-3'>
					{FEATURES.map((feature) => (
						<div
							key={feature.title}
							className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 transition-colors hover:border-white/[0.1] hover:bg-white/[0.05] ${feature.span}`}
						>
							<div className='inline-flex rounded-lg bg-white/[0.06] p-2.5'>
								<feature.icon className='h-5 w-5 text-white/70' />
							</div>
							<h3 className='mt-4 font-medium text-white'>
								{feature.title}
							</h3>
							<p className='mt-2 text-sm leading-relaxed text-white/50'>
								{feature.description}
							</p>
							{feature.visual}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
