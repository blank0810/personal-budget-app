import { AdminSystemService } from '@/server/modules/admin/admin-system.service';
import { CronStatusPanel } from '@/components/modules/admin/CronStatusPanel';
import { QueueHealthPanel } from '@/components/modules/admin/QueueHealthPanel';
import { SystemSettingsTable } from '@/components/modules/admin/SystemSettingsTable';
import { EmailProviderPanel } from '@/components/modules/admin/EmailProviderPanel';
import { NotificationTypeSyncPanel } from '@/components/modules/admin/NotificationTypeSyncPanel';
import prisma from '@/lib/prisma';
import { NOTIFICATION_TYPES } from '@/server/modules/notification/notification.registry';
import { EmailConfigService } from '@/server/modules/email/email.config';
import { getQuotaStatus } from '@/server/modules/email/email.quota';
import { AVAILABLE_PROVIDERS } from '@/server/modules/email/providers/registry';
import { serialize } from '@/lib/serialization';

export default async function AdminSystemPage() {
	const [cronStatuses, queues, settings, emailConfig, emailQuota, typeCount] =
		await Promise.all([
			AdminSystemService.getCronStatus(),
			AdminSystemService.getQueueHealth(),
			AdminSystemService.getSettings(),
			EmailConfigService.getForAdmin(),
			getQuotaStatus(),
			prisma.notificationType.count(),
		]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				System Health
			</h1>
			<CronStatusPanel cronStatuses={cronStatuses} />
			<QueueHealthPanel queues={queues} />

			<h2 className='text-xl font-bold'>Integrations</h2>
			<EmailProviderPanel
				configured={emailConfig.configured}
				providers={serialize(emailConfig.providers)}
				quota={emailQuota}
				availableProviders={AVAILABLE_PROVIDERS}
			/>

			<NotificationTypeSyncPanel
				inDatabase={typeCount}
				inRegistry={NOTIFICATION_TYPES.length}
			/>

			<h2 className='text-xl font-bold'>System Settings</h2>
			<SystemSettingsTable initialSettings={serialize(settings)} />
		</div>
	);
}
