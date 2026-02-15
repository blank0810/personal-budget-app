import { PaymentForm } from '@/components/modules/payment/PaymentForm';
import {
	PaymentList,
	PaymentWithRelations,
} from '@/components/modules/payment/PaymentList';
import { PaymentService } from '@/server/modules/payment/payment.service';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

			<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
				<div className='min-w-0 space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Make Payment</CardTitle>
							<CardDescription>
								Pay off debt from your asset accounts
							</CardDescription>
						</CardHeader>
						<CardContent>
							{hasLiabilities ? (
								<PaymentForm accounts={serialize(accounts)} />
							) : (
								<div className='text-center py-8 text-muted-foreground'>
									<p className='text-sm'>No liability accounts found.</p>
									<p className='text-xs mt-2'>
										Add a credit card or loan account to start making payments.
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					<h2 className='text-lg sm:text-xl font-semibold tracking-tight'>
						Payment History
					</h2>
					<PaymentList
						payments={
							serialize(
								payments
							) as unknown as PaymentWithRelations[]
						}
					/>
				</div>
			</div>
		</div>
	);
}
