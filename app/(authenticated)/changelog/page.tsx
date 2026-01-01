import { Rocket } from 'lucide-react';
import { ChangelogView } from '@/components/modules/changelog/ChangelogView';

const versions = [
	{
		version: 'v1.5',
		date: 'December 31, 2025',
		title: 'Budget Analytics & Liability Fixes',
		description:
			'A major update introducing intelligent budget analytics with problem detection, progress tracking, and critical fixes for liability account balance handling.',
		status: 'current' as const,
		patches: [
			{
				version: 'v1.5.1',
				date: 'January 1, 2026',
				title: 'Budget Health Timezone Fix',
				description:
					'Fixed timezone mismatch between browser and server that prevented Budget Health from displaying on the dashboard.',
				features: [
					{
						title: 'Bug Fixes',
						items: [
							'Fixed Budget Health not displaying despite budgets being defined for the current month.',
							'Normalized budget month storage to UTC midnight on the 1st of the month.',
							'Added date normalization in budget creation and update actions.',
						],
					},
				],
			},
		],
		features: [
			{
				title: 'Budget Health Summary',
				items: [
					'Quick Health Overview: New summary card at the top of the Budget page showing budget status at a glance.',
					'Problem Detection: Automatically flags categories that are consistently over budget (3+ months).',
					'Status Indicators: Color-coded badges showing on-track, warning, and over-budget counts.',
				],
			},
			{
				title: 'Budget Analytics Tab',
				items: [
					'6-Month Trend Chart: Visualizes budget adherence over time with monthly breakdown.',
					'Category Performance Table: Shows average budget vs spent, variance percentage, and trend indicators.',
					'Smart Recommendations: AI-driven suggestions to increase, decrease, or maintain budget amounts.',
					'Budget Health Score: Weighted score combining categories on track, overall adherence, and improvement trend.',
				],
			},
			{
				title: 'Liability Balance Fixes',
				items: [
					'Fixed Expense Calculation: Expenses on credit cards now correctly increase the balance (debt goes up).',
					'Fixed Payment Calculation: Payments to credit cards now correctly decrease the balance (debt goes down).',
					'Consistent Liability Handling: All CRUD operations for expenses and income now properly check the isLiability flag.',
					'Tithe Logic Exclusion: Church tithe calculations are now correctly skipped for liability accounts.',
				],
			},
			{
				title: 'UI Improvements',
				items: [
					'Dynamic Label: Liability accounts now display "Amount Owed" instead of "Current Balance" for clarity.',
					'Icon Standardization: Replaced all hardcoded Unicode emojis with Lucide React icons for consistency and maintainability.',
				],
			},
		],
	},
	{
		version: 'v1.4',
		date: 'December 30, 2025',
		title: 'Financial Analytics & UX Overhaul',
		description:
			'A massive update delivering professional-grade reporting tools, envelope budgeting, and a streamlined data management experience.',
		status: 'released' as const,
		patches: [
			{
				version: 'v1.4.1',
				date: 'December 30, 2025',
				title: 'Credit & Debt Metrics Enhancement',
				description:
					'A patch to fix color logic bugs and enhance dashboard metrics with no-sugarcoating, granular feedback.',
				features: [
					{
						title: 'Bug Fixes',
						items: [
							'Fixed Inverted Credit Utilization Colors: 100% usage now correctly shows red, not green.',
							'Consistent Color Thresholds: Aligned all credit displays with the same 7-tier color system.',
						],
					},
					{
						title: 'Net Worth Indicators',
						items: [
							'Dashboard: Net Worth card now shows green when positive, red when negative with warning.',
							'Balance Sheet: Total Equity shows color-coded status with contextual messages.',
							'Balance Sheet: Fixed credit utilization progress bars in Liabilities showing green at 100% usage.',
						],
					},
					{
						title: 'Credit Utilization Enhancements',
						items: [
							'7-Tier Color Thresholds: 0% (Perfect) → 90%+ (Maxed Out) with granular feedback.',
							'Available Credit Display: Shows "Used: ₱X" and "Available: ₱X" breakdown.',
							'Dynamic Card Styling: Border and icon colors reflect utilization severity.',
						],
					},
					{
						title: 'Debt Paydown Enhancements',
						items: [
							'6-Tier Paydown Thresholds: Honest feedback from "Zero payments" to "Aggressive".',
							'Context-Rich Display: Shows payment as percentage of total debt.',
							'Time-to-Payoff Estimate: Displays "~12 mo to freedom" or "Never at this rate".',
							'Debt-Free State: Celebrates "Debt Free!" when no liabilities exist.',
						],
					},
					{
						title: 'Data Display Updates',
						items: [
							'Transfer List: Added searchable Description column.',
							'Dashboard Liabilities: Each credit card shows "Avail: ₱X" alongside utilization.',
							'Accounts List: Changed to "X% Used | Avail: ₱X" for clearer insight.',
						],
					},
				],
			},
		],
		features: [
			{
				title: 'Reporting Intelligence',
				items: [
					'Net Worth Trend Chart: Visualizes wealth growth over time with a retroactive "reverse-replay" algorithm.',
					'Tabbed Reports Dashboard: Consolidated analytics into distinct Overview, P&L, and Balance Sheet views.',
					'Global Date Controls: Unified sticky toolbar for filtering all charts simultaneously.',
				],
			},
			{
				title: 'Data Management Excellence',
				items: [
					'Interactive DataTables: Added pagination, sorting, filtering, and search to Income, Expense, Transfer, and Budget lists.',
					'Bulk Visibility: Optimized UI to handle thousands of records without performance degradation.',
				],
			},
			{
				title: 'Envelope Budgeting',
				items: [
					'Named Budgets: Users can now create multiple recurring budgets per category (e.g., "Car Insurance" and "Life Insurance").',
					'Budget Tracking: Enhanced precision in linking expenses to specific budget envelopes.',
				],
			},
			{
				title: 'Financial Accuracy',
				items: [
					'Transfer Fees: Added explicit handling for bank fees during transfers.',
					'Account Archiving: Implemented "Soft Delete" to hide old accounts without losing historical data.',
					'Liability Accounting Standard: Standardized "Balance = Amount Owed" for consistency.',
				],
			},
		],
	},
	{
		version: 'v1.3',
		date: 'December 28, 2025',
		title: 'Credit Logic Hotpatch',
		description:
			'A critical update to align system logic with our financial reality regarding credit utilization and debt calculation.',
		status: 'released' as const,
		features: [
			{
				title: 'Hotfix',
				items: [
					'Corrected Credit Utilization: Fixed logic that incorrectly interpreted "Available Credit" as "Debt".',
					'Accurate Liability Tracking: Dashboards and Reports now show the actual amount owed on credit cards.',
					'Visual Integrity: Utilization progress bars now correctly indicate safety (Green = Low Usage) and danger (Red = High Usage) zones.',
					'Expense Form UI: Resolved an issue where selecting a category would not display the selected value in the form field.',
				],
			},
		],
	},
	{
		version: 'v1.2',
		date: 'December 27, 2025',
		title: 'Solvency & Integrity Update',
		description:
			'A major architectural shift focusing on financial solvency, credit integrity, and accurate liability tracking. We moved away from simple cash flow tracking to a more robust "Net Worth" model.',
		status: 'released' as const,
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
		date: 'December 15, 2025',
		title: 'Analytics & Account Management',
		description:
			'Enhanced the application with deep-dive reporting capabilities and full account lifecycle management.',
		status: 'released' as const,
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
		date: 'December 1, 2025',
		title: 'Foundation Release',
		description:
			'The initial launch of the Personal Budget Planner, establishing the core pillars of financial tracking.',
		status: 'released' as const,
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
		<div className='container py-10 space-y-8'>
			<div className='flex flex-col gap-2'>
				<h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
					<Rocket className='h-8 w-8 text-primary' />
					Product Updates
				</h1>
				<p className='text-muted-foreground text-lg'>
					A timeline of how the Budget Planner is evolving to help you build
					wealth.
				</p>
			</div>

			<ChangelogView versions={versions} />
		</div>
	);
}
