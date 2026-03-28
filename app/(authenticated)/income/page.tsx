import { IncomeForm } from '@/components/modules/income/IncomeForm';
import { IncomeViews } from '@/components/modules/income/IncomeViews';
import { IncomeService } from '@/server/modules/income/income.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { GoalService } from '@/server/modules/goal/goal.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';
import { startOfMonth, endOfMonth } from 'date-fns';

export default async function IncomePage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const now = new Date();
	const monthStart = startOfMonth(now);
	const monthEnd = endOfMonth(now);

	const [initialResult, accounts, categories, efGoal, monthlyTotals] =
		await Promise.all([
			IncomeService.getPaginatedIncomes(session.user.id, {
				page: 1,
				pageSize: 20,
				sortBy: 'date',
				sortOrder: 'desc',
				startDate: monthStart,
				endDate: monthEnd,
			}),
			AccountService.getAccounts(session.user.id),
			CategoryService.getCategories(session.user.id, 'INCOME'),
			GoalService.getEmergencyFundGoal(session.user.id),
			IncomeService.getMonthlyTotals(session.user.id, now.getFullYear()),
		]);

	// User has an EF goal with a linked account
	const hasEmergencyFundGoal = !!efGoal?.linkedAccountId;

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Income</h1>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Add Income</CardTitle>
						</CardHeader>
						<CardContent>
							<IncomeForm
								accounts={serialize(accounts)}
								categories={serialize(categories)}
								hasEmergencyFundGoal={hasEmergencyFundGoal}
							/>
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<IncomeViews
						initialIncomes={serialize(initialResult.data)}
						initialTotal={initialResult.total}
						initialMonthlyTotals={monthlyTotals}
						initialYear={now.getFullYear()}
						initialMonth={now.getMonth()}
					/>
				</div>
			</div>
		</div>
	);
}
