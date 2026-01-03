import { TransferForm } from '@/components/modules/transfer/TransferForm';
import {
	TransferList,
	TransferWithRelations,
} from '@/components/modules/transfer/TransferList';
import { TransferService } from '@/server/modules/transfer/transfer.service';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';

export default async function TransfersPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	// ... (existing imports)

	const [transfers, accounts] = await Promise.all([
		TransferService.getTransfers(session.user.id),
		AccountService.getAccounts(session.user.id),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Transfers</h1>
			</div>

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>New Transfer</CardTitle>
						</CardHeader>
						<CardContent>
							<TransferForm accounts={serialize(accounts)} />
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<h2 className='text-lg sm:text-xl font-semibold tracking-tight'>
						Recent Transfers
					</h2>
					<TransferList
						transfers={
							serialize(
								transfers
							) as unknown as TransferWithRelations[]
						}
					/>
				</div>
			</div>
		</div>
	);
}
