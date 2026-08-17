import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/redis';
import prisma from '@/lib/prisma';
import { ReportService, reportEmailIdempotencyKey } from './report.service';

type ReportJobData = {
	userId: string;
	period: string; // ISO date string
};

let queue: Queue<ReportJobData> | null = null;

function getQueue(): Queue<ReportJobData> {
	if (!queue) {
		queue = new Queue<ReportJobData>('monthly-reports', {
			connection: getRedisConnection(),
		});
	}
	return queue;
}

/**
 * Add a single report job to the queue
 */
export async function addReportJob(
	userId: string,
	period: Date,
	priority: number = 10
) {
	const q = getQueue();
	await q.add(
		'generate-report',
		{ userId, period: period.toISOString() },
		{
			priority,
			attempts: 3,
			backoff: { type: 'exponential', delay: 60000 },
			removeOnComplete: true,
			removeOnFail: { age: 7 * 24 * 3600 },
		}
	);
}

/**
 * Add batch report jobs for multiple users
 */
export async function addBatchReportJobs(userIds: string[], period: Date) {
	const q = getQueue();
	const jobs = userIds.map((userId) => ({
		name: 'generate-report',
		data: { userId, period: period.toISOString() },
		opts: {
			priority: 10,
			attempts: 3,
			backoff: { type: 'exponential' as const, delay: 60000 },
			removeOnComplete: true,
			removeOnFail: { age: 7 * 24 * 3600 },
		},
	}));
	await q.addBulk(jobs);
}

/**
 * Process a batch of jobs from the queue.
 * Creates a short-lived Worker that processes up to batchSize jobs,
 * then shuts down — suitable for serverless cron invocations.
 */
export async function processBatch(batchSize: number = 40): Promise<number> {
	let processed = 0;

	return new Promise<number>((resolve) => {
		// If no jobs arrive within 30 seconds, resolve with 0
		const timeout = setTimeout(async () => {
			await worker.close();
			resolve(processed);
		}, 30000);

		const worker = new Worker<ReportJobData>(
			'monthly-reports',
			async (job) => {
				const { userId, period } = job.data;
				const periodDate = new Date(period);

				// Deduplication. Generation alone is NOT proof of delivery:
				// generateAndSend marks the MonthlyReport completed (step 4) before
				// it sends the email (step 5), so a send failure previously left the
				// row completed and every retry short-circuited here — losing the
				// email permanently. Require a recorded successful send too.
				const existing = await prisma.monthlyReport.findUnique({
					where: { userId_period: { userId, period: periodDate } },
				});

				if (existing?.status === 'completed') {
					const delivered = await prisma.emailSendLog.findUnique({
						where: {
							idempotencyKey: reportEmailIdempotencyKey(userId, periodDate),
						},
					});

					// Already delivered, or suppressed by the daily quota guard — in
					// which case retrying now would only be suppressed again; the next
					// scheduler tick picks it up with a fresh allowance.
					if (
						delivered?.status === 'SENT' ||
						delivered?.status === 'SUPPRESSED_QUOTA'
					) {
						return 'already-exists';
					}
				}

				await ReportService.generateAndSend(userId, periodDate);
				return 'success';
			},
			{
				connection: getRedisConnection(),
				concurrency: 1,
			}
		);

		worker.on('completed', async () => {
			processed++;
			if (processed >= batchSize) {
				clearTimeout(timeout);
				await worker.close();
				resolve(processed);
			}
		});

		worker.on('failed', async (_job, error) => {
			console.error('Report job failed:', error.message);
			processed++;
			if (processed >= batchSize) {
				clearTimeout(timeout);
				await worker.close();
				resolve(processed);
			}
		});
	});
}
