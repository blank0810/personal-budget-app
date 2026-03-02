import { Landmark, FileSpreadsheet, Eye } from 'lucide-react';

const PAIN_POINTS = [
	{
		icon: Landmark,
		title: 'Banking apps show balances, not budgets.',
		description:
			'You know what you have — but not where it goes. Account balances don\u2019t tell you if you\u2019re overspending on takeout.',
	},
	{
		icon: FileSpreadsheet,
		title: 'Spreadsheets break the moment life gets busy.',
		description:
			'Manual tracking works for a week. Then you miss a day, the formulas break, and you\u2019re back to guessing.',
	},
	{
		icon: Eye,
		title: 'You deserve one place for the full picture.',
		description:
			'Income, expenses, budgets, goals — scattered across apps and tabs. You need everything in one view.',
	},
];

export function ProblemStatement() {
	return (
		<section className='landing-reveal py-20'>
			<div className='mx-auto max-w-6xl px-6'>
				<div className='text-center'>
					<p className='text-xs font-medium uppercase tracking-widest text-primary/80'>
						The problem
					</p>
					<h2 className='mt-3 text-2xl font-semibold text-white md:text-3xl'>
						Your money is scattered across apps, spreadsheets, and
						guesswork.
					</h2>
				</div>

				<div className='landing-stagger mt-14 grid gap-8 md:grid-cols-3'>
					{PAIN_POINTS.map((pain) => (
						<div
							key={pain.title}
							className='landing-reveal border-t border-white/10 pt-6'
						>
							<pain.icon className='h-5 w-5 text-white/40' />
							<h3 className='mt-3 font-medium text-white'>
								{pain.title}
							</h3>
							<p className='mt-2 text-sm leading-relaxed text-white/50'>
								{pain.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
