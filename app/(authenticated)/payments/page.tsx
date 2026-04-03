import { PaymentPageContainer } from '@/components/modules/payment/PaymentPageContainer';
import { PaymentWithRelations } from '@/components/modules/payment/PaymentList';
import { PaymentService } from '@/server/modules/payment/payment.service';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/serialization';

export default async function PaymentsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const [payments, accounts] = await Promise.all([
		PaymentService.getPayments(session.user.id),
		AccountService.getAccounts(session.user.id),
	]);

	// Check if user has any liability accounts
	const hasLiabilities = accounts.some((a) => a.isLiability && !a.isArchived);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<div>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Payments</h1>
					<p className='text-muted-foreground text-sm mt-1'>
						Pay off your credit cards and loans
					</p>
				</div>
			</div>

			<PaymentPageContainer
				payments={serialize(payments) as unknown as PaymentWithRelations[]}
				accounts={serialize(accounts)}
				hasLiabilities={hasLiabilities}
			/>
		</div>
	);
}
