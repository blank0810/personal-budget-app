import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { AccountService } from '@/server/modules/account/account.service';
import { InvoiceDetail } from '@/components/modules/invoice/InvoiceDetail';
import type { InvoiceWithDetails } from '@/components/modules/invoice/InvoiceDetail';
import { serialize } from '@/lib/serialization';

interface InvoiceDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
	params,
}: InvoiceDetailPageProps) {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const { id } = await params;

	const [invoice, accounts] = await Promise.all([
		InvoiceService.getById(session.user.id, id),
		AccountService.getAccounts(session.user.id),
	]);

	if (!invoice) notFound();

	return (
		<div className='container mx-auto py-6 md:py-10'>
			<InvoiceDetail
				invoice={serialize(invoice) as unknown as InvoiceWithDetails}
				accounts={serialize(accounts).map(
					(a: { id: string; name: string }) => ({
						id: a.id,
						name: a.name,
					})
				)}
			/>
		</div>
	);
}
