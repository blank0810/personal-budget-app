import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/redis';
import { SmsService } from './sms.service';

type SmsJobData = {
	to: string;
	message: string;
};

let queue: Queue<SmsJobData> | null = null;

function getQueue(): Queue<SmsJobData> {
	if (!queue) {
		queue = new Queue<SmsJobData>('sms-notifications', {
			connection: getRedisConnection(),
		});
	}
	return queue;
}

/**
 * Add an SMS job to the rate-limited queue
 */
export async function addSmsJob(to: string, message: string) {
	const q = getQueue();
	await q.add(
		'send-sms',
		{ to, message },
		{
			attempts: 2,
			backoff: { type: 'exponential', delay: 15000 },
			removeOnComplete: true,
			removeOnFail: { age: 24 * 3600 },
		}
	);
}

/**
 * Process a batch of SMS jobs from the queue.
 * Creates a short-lived Worker with rate limiting (1 per 10 seconds),
 * processes up to batchSize jobs, then shuts down.
 * Suitable for serverless cron invocations.
 */
export async function processBatch(batchSize: number = 5): Promise<number> {
	let processed = 0;

	return new Promise<number>((resolve) => {
		// If no jobs arrive within 5 seconds, resolve with 0
		const timeout = setTimeout(async () => {
			await worker.close();
			resolve(processed);
		}, 5000);

		const worker = new Worker<SmsJobData>(
			'sms-notifications',
			async (job) => {
				const { to, message } = job.data;
				const success = await SmsService.send(to, message);
				if (!success) {
					throw new Error(`SMS delivery failed for ${to}`);
				}
				return 'sent';
			},
			{
				connection: getRedisConnection(),
				concurrency: 1,
				limiter: {
					max: 1,
					duration: 10000, // 1 SMS per 10 seconds
				},
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
			console.error('SMS job failed:', error.message);
			processed++;
			if (processed >= batchSize) {
				clearTimeout(timeout);
				await worker.close();
				resolve(processed);
			}
		});
	});
}
