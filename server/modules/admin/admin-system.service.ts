import type { AutomationFrequency } from '@prisma/client';
import prisma from '@/lib/prisma';
import { Queue } from 'bullmq';
import { getRedisConnection } from '@/lib/redis';

const EXPECTED_INTERVAL_MINUTES: Record<AutomationFrequency, number> = {
	HOURLY: 60,
	DAILY: 24 * 60,
	WEEKLY: 7 * 24 * 60,
	MONTHLY: 30 * 24 * 60,
};

export const AdminSystemService = {
	async getCronStatus() {
		const schedules = await prisma.automationSchedule.findMany({
			where: { userId: null },
			orderBy: { jobKey: 'asc' },
		});

		// Get the latest log entry for each cron key
		const latestLogs = await Promise.all(
			schedules.map((schedule) =>
				prisma.cronRunLog.findFirst({
					where: { key: schedule.jobKey },
					orderBy: { runAt: 'desc' },
				})
			)
		);

		return schedules.map((schedule, i) => {
			const log = latestLogs[i];
			const scheduleMins =
				EXPECTED_INTERVAL_MINUTES[schedule.frequency];

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
				key: schedule.jobKey,
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
		const queueNames = ['monthly-reports'];
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

	// --- System Settings ---

	async getSettings() {
		return prisma.systemSetting.findMany({
			orderBy: { key: 'asc' },
		});
	},

	async updateSetting(key: string, value: string) {
		return prisma.systemSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	},
};
