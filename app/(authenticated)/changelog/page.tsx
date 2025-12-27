import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Rocket, Zap } from 'lucide-react';

interface Version {
	version: string;
	date: string;
	title: string;
	description: string;
	features: {
		title: string;
		items: string[];
	}[];
	status: 'current' | 'released';
}

const versions: Version[] = [
	{
		version: 'v1.2',
		date: 'December 27, 2024',
		title: 'Solvency & Integrity Update',
		description:
			'A major architectural shift focusing on financial solvency, credit integrity, and accurate liability tracking. We moved away from simple cash flow tracking to a more robust "Net Worth" model.',
		status: 'current',
		features: [
			{
				title: 'Dashboard Refactor',
				items: [
					'Introduced "Solvency First" design philosophy.',
					'Replaced tactical cash flow cards with a Financial Health Grid (Net Worth, Runway, Debt To Asset).',
					'Added "Total Debt" and "Credit Utilization" as primary KPI metrics.',
					'Split Account Overview into distinct "Liquid Assets" and "Liabilities" sections.',
				],
			},
			{
				title: 'Financial Reporting',
				items: [
					'Completely Redesigned Balance Sheet: Aligned Assets & Liabilities for easier reading.',
					'Added Net Worth Context: New footer showing Total Equity (Assets - Liabilities).',
					'Detailed Liability Context: Added credit utilization bars directly to liability accounts in the report.',
				],
			},
			{
				title: 'Credit Card Integrity',
				items: [
					'Enforced strict liability logic: Credit Cards & Loans are now always treated as Liabilities.',
					'Added "Credit Limit" field to account management.',
					'Implemented strict backend validation to prevent misclassification of debt instruments.',
				],
			},
			{
				title: 'Visual Enhancements',
				items: [
					'Added color-coded "Danger Thresholds" (50%) for credit utilization bars.',
					'Improved empty states for various sections.',
				],
			},
		],
	},
	{
		version: 'v1.1',
		date: 'December 15, 2024',
		title: 'Analytics & Account Management',
		description:
			'Enhanced the application with deep-dive reporting capabilities and full account lifecycle management.',
		status: 'released',
		features: [
			{
				title: 'Advanced Reports',
				items: [
					'Launched "Monthly Comparison" chart to track spending trends over time.',
					'Added "Category Breakdown" pie charts for granular expense analysis.',
					'Introduced "Budget Performance" tracking to visualize actual vs. planned spending.',
				],
			},
			{
				title: 'Account Control',
				items: [
					'Full Create/Read/Update/Delete (CRUD) capabilities for financial accounts.',
					'Support for multiple account types (Bank, Cash, Investment, Loan).',
					'Real-time balance updates reflected across all dashboard metrics.',
				],
			},
		],
	},
	{
		version: 'v1.0',
		date: 'December 1, 2024',
		title: 'Foundation Release',
		description:
			'The initial launch of the Personal Budget Planner, establishing the core pillars of financial tracking.',
		status: 'released',
		features: [
			{
				title: 'Core Tracking',
				items: [
					'Transaction logging for Income and Expenses.',
					'Category tagging with custom colors and icons.',
					'Internal Transfer system for moving money between accounts without affecting net income.',
				],
			},
			{
				title: 'Security & Infrastructure',
				items: [
					'Secure Authentication via NextAuth.js.',
					'Robust PostgreSQL database schema with Prisma ORM.',
					'Responsive, mobile-friendly UI built with Tailwind CSS and Shadcn/ui.',
				],
			},
		],
	},
];

export default function ChangelogPage() {
	return (
		<div className='container max-w-4xl py-10 space-y-8'>
			<div className='flex flex-col gap-2'>
				<h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
					<Rocket className='h-8 w-8 text-primary' />
					Product Updates
				</h1>
				<p className='text-muted-foreground text-lg'>
					A timeline of how the Budget Planner is evolving to help you
					build wealth.
				</p>
			</div>

			<div className='relative border-l border-muted ml-4 md:ml-6 space-y-12'>
				{versions.map((version) => (
					<div
						key={version.version}
						className='relative pl-8 md:pl-12'
					>
						{/* Timeline Dot */}
						<div
							className={`absolute -left-[9px] top-6 h-4 w-4 rounded-full border-2 ${
								version.status === 'current'
									? 'bg-primary border-primary ring-4 ring-primary/20'
									: 'bg-background border-muted-foreground'
							}`}
						/>

						<div className='flex flex-col gap-6 pt-5'>
							{/* Header */}
							<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4'>
								<div className='space-y-1'>
									<div className='flex items-center gap-3'>
										<h2 className='text-2xl font-bold text-foreground'>
											{version.version}
										</h2>
										{version.status === 'current' && (
											<Badge
												variant='default'
												className='bg-emerald-600 hover:bg-emerald-700'
											>
												Latest Release
											</Badge>
										)}
									</div>
									<h3 className='text-xl font-semibold text-primary'>
										{version.title}
									</h3>
								</div>
								<div className='text-sm text-muted-foreground font-medium bg-secondary/50 px-3 py-1 rounded-full w-fit'>
									{version.date}
								</div>
							</div>

							{/* Content */}
							<div className='space-y-6'>
								<p className='text-muted-foreground leading-relaxed'>
									{version.description}
								</p>

								<div className='grid gap-6 md:grid-cols-2'>
									{version.features.map((feature) => (
										<Card
											key={feature.title}
											className='bg-card/50 border-none shadow-sm'
										>
											<CardHeader className='pb-3'>
												<CardTitle className='text-base font-semibold flex items-center gap-2'>
													{version.status ===
													'current' ? (
														<Zap className='h-4 w-4 text-amber-500' />
													) : (
														<CheckCircle2 className='h-4 w-4 text-emerald-500' />
													)}
													{feature.title}
												</CardTitle>
											</CardHeader>
											<CardContent>
												<ul className='space-y-2.5'>
													{feature.items.map(
														(item, i) => (
															<li
																key={i}
																className='text-sm text-muted-foreground flex items-start gap-2'
															>
																<span className='mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0' />
																{item}
															</li>
														)
													)}
												</ul>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
