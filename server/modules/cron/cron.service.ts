import prisma from '@/lib/prisma';

export const CronService = {
	async logSuccess(
		key: string,
		data: { processedCount: number; duration: number }
	) {
		await prisma.cronRunLog.create({
			data: {
				key,
				status: 'success',
				processedCount: data.processedCount,
				duration: data.duration,
			},
		});
	},

	async logFailure(
		key: string,
		data: { error: unknown; duration: number }
	) {
		await prisma.cronRunLog.create({
			data: {
				key,
				status: 'failed',
				errorMessage:
					data.error instanceof Error
						? data.error.message
						: 'Unknown error',
				duration: data.duration,
			},
		});
	},
};
