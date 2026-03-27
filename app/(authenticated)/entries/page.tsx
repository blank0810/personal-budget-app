import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WorkEntryService } from '@/server/modules/work-entry/work-entry.service';
import { ClientService } from '@/server/modules/client/client.service';
import { WorkEntryForm } from '@/components/modules/work-entry/WorkEntryForm';
import { WorkEntryList } from '@/components/modules/work-entry/WorkEntryList';
import { serialize } from '@/lib/serialization';
import type { WorkEntryRow } from '@/components/modules/work-entry/WorkEntryList';

export default async function EntriesPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [entries, clients] = await Promise.all([
		WorkEntryService.getAll(session.user.id, { take: 100 }),
		ClientService.getAll(session.user.id),
	]);

	const serializedClients = serialize(clients) as Array<{
		id: string;
		name: string;
		defaultRate: number | null;
	}>;

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Billable Entries
			</h1>
			<WorkEntryForm clients={serializedClients} />
			<WorkEntryList
				entries={serialize(entries) as unknown as WorkEntryRow[]}
				clients={serializedClients}
			/>
		</div>
	);
}
