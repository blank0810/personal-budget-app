import { IncomeForm } from '@/components/modules/income/IncomeForm';
import { IncomeViews } from '@/components/modules/income/IncomeViews';
import { IncomeService } from '@/server/modules/income/income.service';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';

export default async function IncomePage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin'); // Basic redirect for now
	}

	const incomes = await IncomeService.getIncomes(session.user.id);
	const accounts = await AccountService.getAccounts(session.user.id);
	const categories = await CategoryService.getCategories(
		session.user.id,
		'INCOME'
	);

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
							/>
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<IncomeViews incomes={serialize(incomes)} />
				</div>
			</div>
		</div>
	);
}
