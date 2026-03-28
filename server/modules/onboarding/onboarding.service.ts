import { UserService } from '@/server/modules/user/user.service';

export class OnboardingService {
	static async setCurrency(userId: string, currency: string) {
		// Currency can only be set during onboarding (before isOnboarded is true)
		const isOnboarded = await UserService.getIsOnboarded(userId);
		if (isOnboarded) {
			throw new Error('Currency cannot be changed after onboarding');
		}

		await UserService.setCurrency(userId, currency);
	}

	static async completeOnboarding(userId: string) {
		await UserService.completeOnboarding(userId);
	}
}
