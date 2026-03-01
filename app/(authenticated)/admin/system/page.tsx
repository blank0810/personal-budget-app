import { AdminSystemService } from '@/server/modules/admin/admin-system.service';
import { CronStatusPanel } from '@/components/modules/admin/CronStatusPanel';
import { QueueHealthPanel } from '@/components/modules/admin/QueueHealthPanel';

export default async function AdminSystemPage() {
	const [cronStatuses, queues] = await Promise.all([
		AdminSystemService.getCronStatus(),
		AdminSystemService.getQueueHealth(),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				System Health
			</h1>
			<CronStatusPanel cronStatuses={cronStatuses} />
			<QueueHealthPanel queues={queues} />
		</div>
	);
}
