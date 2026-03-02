import prisma from '@/lib/prisma';
import { Queue } from 'bullmq';
import { getRedisConnection } from '@/lib/redis';

const CRON_SCHEDULES: Record<string, number> = {
	'process-recurring': 24 * 60, // daily, in minutes
	'monthly-report': 30 * 24 * 60, // monthly
	'process-reports': 5, // every 5 minutes
	'process-sms': 5, // every 5 minutes
};

export const AdminSystemService = {
	async getCronStatus() {
		// Get the latest log entry for each cron key
		const keys = Object.keys(CRON_SCHEDULES);
		const latestLogs = await Promise.all(
			keys.map((key) =>
				prisma.cronRunLog.findFirst({
					where: { key },
					orderBy: { runAt: 'desc' },
				})
			)
		);

		return keys.map((key, i) => {
			const log = latestLogs[i];
			const scheduleMins = CRON_SCHEDULES[key];

			let health: 'green' | 'yellow' | 'red' = 'green';
			if (!log) {
				health = 'yellow'; // Never ran
			} else if (log.status === 'failed') {
				health = 'red';
			} else {
				const minutesSinceRun =
					(Date.now() - log.runAt.getTime()) / (1000 * 60);
				if (minutesSinceRun > scheduleMins * 2) {
					health = 'red';
				} else if (minutesSinceRun > scheduleMins * 1.5) {
					health = 'yellow';
				}
			}

			return {
				key,
				lastRunAt: log?.runAt || null,
				status: log?.status || 'never',
				processedCount: log?.processedCount || 0,
				duration: log?.duration || null,
				errorMessage: log?.errorMessage || null,
				health,
			};
		});
	},

	async getQueueHealth() {
		const queueNames = ['monthly-reports', 'sms-notifications'];
		const results: Array<{
			name: string;
			waiting: number;
			active: number;
			completed: number;
			failed: number;
		}> = [];

		for (const name of queueNames) {
			try {
				const queue = new Queue(name, {
					connection: getRedisConnection(),
				});
				const counts = await queue.getJobCounts(
					'waiting',
					'active',
					'completed',
					'failed'
				);
				results.push({
					name,
					waiting: counts.waiting || 0,
					active: counts.active || 0,
					completed: counts.completed || 0,
					failed: counts.failed || 0,
				});
				await queue.close();
			} catch {
				results.push({
					name,
					waiting: 0,
					active: 0,
					completed: 0,
					failed: 0,
				});
			}
		}

		return results;
	},

	async getRecentCronLogs(limit: number = 20) {
		return prisma.cronRunLog.findMany({
			orderBy: { runAt: 'desc' },
			take: limit,
		});
	},
};
