import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceDashboardWidget } from '@/components/modules/invoice/InvoiceDashboardWidget';

interface InvoiceSectionProps {
	userId: string;
	currency: string;
}

export async function InvoiceSection({ userId, currency }: InvoiceSectionProps) {
	const invoiceSummary = await InvoiceService.getSummary(userId);

	return (
		<InvoiceDashboardWidget
			outstanding={invoiceSummary.outstanding}
			overdueCount={invoiceSummary.overdueCount}
			draftCount={invoiceSummary.draftCount}
			userCurrency={currency}
		/>
	);
}
