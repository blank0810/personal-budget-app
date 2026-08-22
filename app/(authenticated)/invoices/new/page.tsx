import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InvoiceForm } from '@/components/modules/invoice/InvoiceForm';
import type { ClientOption } from '@/components/modules/invoice/InvoiceForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ClientService } from '@/server/modules/client/client.service';
import { UserService } from '@/server/modules/user/user.service';
import { serialize } from '@/lib/serialization';

export default async function NewInvoicePage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');
	const [clients, userCurrency] = await Promise.all([
		ClientService.getAll(session.user.id),
		UserService.getCurrency(session.user.id),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<div className='flex items-center gap-4'>
				<Button variant='ghost' size='sm' asChild>
					<Link href='/invoices'>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Back to Invoices
					</Link>
				</Button>
			</div>

			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				New Invoice
			</h1>

			<div className='max-w-3xl'>
				<InvoiceForm
					mode='create'
					clients={serialize(clients) as unknown as ClientOption[]}
					userCurrency={userCurrency}
				/>
			</div>
		</div>
	);
}
