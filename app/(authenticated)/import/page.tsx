import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import { AccountService } from '@/server/modules/account/account.service';
import { CategoryService } from '@/server/modules/category/category.service';
import { ImportWizard } from '@/components/modules/import/ImportWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';

export default async function ImportPage() {
	await requireFeature('csv_import');
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [accounts, incomeCategories, expenseCategories] = await Promise.all([
		AccountService.getAccounts(session.user.id),
		CategoryService.getCategories(session.user.id, 'INCOME'),
		CategoryService.getCategories(session.user.id, 'EXPENSE'),
	]);

	const allCategories = [
		...incomeCategories.map((c) => ({
			id: c.id,
			name: c.name,
			type: 'INCOME',
		})),
		...expenseCategories.map((c) => ({
			id: c.id,
			name: c.name,
			type: 'EXPENSE',
		})),
	];

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Import Transactions
				</h1>
			</div>

			<Card className='max-w-3xl'>
				<CardHeader>
					<CardTitle>CSV Import</CardTitle>
				</CardHeader>
				<CardContent>
					<ImportWizard
						accounts={serialize(accounts).map(
							(a: { id: string; name: string }) => ({
								id: a.id,
								name: a.name,
							})
						)}
						categories={allCategories}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
