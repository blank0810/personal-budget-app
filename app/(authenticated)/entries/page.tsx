import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WorkEntryService } from '@/server/modules/work-entry/work-entry.service';
import { ClientService } from '@/server/modules/client/client.service';
import { WorkEntryForm } from '@/components/modules/work-entry/WorkEntryForm';
import { WorkEntryList } from '@/components/modules/work-entry/WorkEntryList';
import { serialize } from '@/lib/serialization';
import type { WorkEntryRow } from '@/components/modules/work-entry/WorkEntryList';

const ENTRIES_PAGE_LIMIT = 100;

export default async function EntriesPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [entries, clients, totalCount] = await Promise.all([
		WorkEntryService.getAll(session.user.id, { take: ENTRIES_PAGE_LIMIT }),
		ClientService.getAll(session.user.id),
		WorkEntryService.count(session.user.id),
	]);

	const serializedClients = serialize(clients) as Array<{
		id: string;
		name: string;
		defaultRate: number | null;
	}>;

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='space-y-1'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Billable Entries
				</h1>
				<p className='text-sm text-muted-foreground'>
					Log your work, then generate invoices from unbilled entries.
				</p>
			</div>
			<WorkEntryForm clients={serializedClients} />
			<WorkEntryList
				entries={serialize(entries) as unknown as WorkEntryRow[]}
				clients={serializedClients}
				totalCount={totalCount}
				pageLimit={ENTRIES_PAGE_LIMIT}
			/>
		</div>
	);
}
