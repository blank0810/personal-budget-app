import prisma from '@/lib/prisma';

export class OnboardingService {
	static async setCurrency(userId: string, currency: string) {
		// Currency can only be set during onboarding (before isOnboarded is true)
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { isOnboarded: true },
		});
		if (user?.isOnboarded) {
			throw new Error('Currency cannot be changed after onboarding');
		}

		await prisma.user.update({
			where: { id: userId },
			data: { currency },
		});
	}

	static async completeOnboarding(userId: string) {
		await prisma.user.update({
			where: { id: userId },
			data: { isOnboarded: true },
		});
	}
}
