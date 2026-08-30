import { BudgetForm } from '@/components/modules/budget/BudgetForm';
import { BudgetViews } from '@/components/modules/budget/BudgetViews';
import { BudgetService } from '@/server/modules/budget/budget.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import { startOfMonth } from 'date-fns';
import { BudgetHealthSummary } from '@/components/modules/budget/BudgetHealthSummary';
import { CategorySpendComparison } from '@/components/modules/budget/CategorySpendComparison';
import {
	getBudgetHealthSummaryAction,
	getCategorySpendComparisonAction,
	getInferredEnvelopeOfferAction,
} from '@/server/modules/budget/budget.controller';

export default async function BudgetsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	// Get stable current month (first day) to avoid hydration mismatch
	const currentMonth = startOfMonth(new Date());

	const [budgets, categories, healthResult] = await Promise.all([
		BudgetService.getBudgetsWithCoverage(session.user.id),
		CategoryService.getCategories(session.user.id, 'EXPENSE'),
		getBudgetHealthSummaryAction(currentMonth),
	]);
	const noBudgetResults =
		healthResult.success && !healthResult.data.hasBudgets
			? await Promise.all([
					getCategorySpendComparisonAction({ month: currentMonth }),
					getInferredEnvelopeOfferAction({ month: currentMonth }),
				])
			: null;
	const categoryComparisonResult = noBudgetResults?.[0] ?? null;
	const envelopeOfferResult = noBudgetResults?.[1] ?? null;
	const envelopeSuggestions =
		envelopeOfferResult?.success && envelopeOfferResult.data.eligible
			? envelopeOfferResult.data.suggestions
			: [];

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<header className='space-y-4'>
				<div className='flex justify-between items-center'>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
						Budgets
					</h1>
				</div>
				{healthResult.success && (
					<BudgetHealthSummary
						health={healthResult.data}
						month={currentMonth}
					/>
				)}
			</header>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Set Budget</CardTitle>
						</CardHeader>
						<CardContent>
							<BudgetForm
								categories={serialize(categories)}
								envelopeSuggestions={envelopeSuggestions}
							/>
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					{healthResult.success &&
					!healthResult.data.hasBudgets &&
					categoryComparisonResult?.success ? (
						<CategorySpendComparison
							items={categoryComparisonResult.data}
							month={currentMonth}
						/>
					) : (
						<BudgetViews
							budgets={serialize(budgets)}
							initialMonth={currentMonth}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
