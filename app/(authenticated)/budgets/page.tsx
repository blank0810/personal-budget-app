import { BudgetForm } from '@/components/modules/budget/BudgetForm';
import { BudgetViews } from '@/components/modules/budget/BudgetViews';
import { CategoryService } from '@/server/modules/category/category.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import { BudgetHealthSummary } from '@/components/modules/budget/BudgetHealthSummary';
import { CategorySpendComparison } from '@/components/modules/budget/CategorySpendComparison';
import {
	getBudgetsPageDataAction,
	getBudgetHealthSummaryAction,
	getCategorySpendComparisonAction,
	getInferredEnvelopeOfferAction,
} from '@/server/modules/budget/budget.controller';

export default async function BudgetsPage({
	searchParams,
}: {
	searchParams: Promise<{ month?: string | string[] }>;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const params = await searchParams;
	const [pageData, categories] = await Promise.all([
		getBudgetsPageDataAction(params.month),
		CategoryService.getCategories(session.user.id, 'EXPENSE'),
	]);
	const { month, budgets, yearOverview, availableMonths } = pageData;
	const healthResult = await getBudgetHealthSummaryAction(month);
	const noBudgetResults =
		healthResult.success && !healthResult.data.hasBudgets
			? await Promise.all([
					getCategorySpendComparisonAction({ month }),
					getInferredEnvelopeOfferAction({ month }),
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
						month={month}
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
							month={month}
						/>
					) : (
						<BudgetViews
							budgets={serialize(budgets)}
							yearOverview={yearOverview}
							availableMonths={availableMonths}
							initialMonth={month}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
