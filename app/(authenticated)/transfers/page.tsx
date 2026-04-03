import { TransferPageContainer } from '@/components/modules/transfer/TransferPageContainer';
import { TransferWithRelations } from '@/components/modules/transfer/TransferList';
import { TransferService } from '@/server/modules/transfer/transfer.service';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/serialization';

export default async function TransfersPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const [transfers, accounts] = await Promise.all([
		TransferService.getTransfers(session.user.id),
		AccountService.getAccounts(session.user.id),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Transfers</h1>
			</div>

			<TransferPageContainer
				transfers={serialize(transfers) as unknown as TransferWithRelations[]}
				accounts={serialize(accounts)}
			/>
		</div>
	);
}
