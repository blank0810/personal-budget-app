import { StatementPrintView } from '@/components/modules/reports/StatementPrintView';
import { StatementPrintPayload } from '@/server/modules/report/report.types';

interface PrintPageProps {
	searchParams: Promise<{ data?: string }>;
}

function decodePayload(
	data: string
): { success: true; payload: StatementPrintPayload } | { success: false } {
	try {
		const decoded = Buffer.from(data, 'base64').toString('utf-8');
		const payload: StatementPrintPayload = JSON.parse(decoded);
		return { success: true, payload };
	} catch {
		return { success: false };
	}
}

export default async function StatementPrintPage({
	searchParams,
}: PrintPageProps) {
	const params = await searchParams;

	if (!params.data) {
		return (
			<div className='flex items-center justify-center min-h-screen bg-white'>
				<p className='text-slate-500'>No statement data provided.</p>
			</div>
		);
	}

	const result = decodePayload(params.data);

	if (!result.success) {
		return (
			<div className='flex items-center justify-center min-h-screen bg-white'>
				<p className='text-slate-500'>Invalid statement data.</p>
			</div>
		);
	}

	return <StatementPrintView {...result.payload} />;
}
