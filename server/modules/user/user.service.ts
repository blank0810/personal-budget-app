import prisma from '@/lib/prisma';
import type {
	UserForLayout,
	UserProfile,
	UserEmailAndCreatedAt,
	UserEmailAndName,
	UserNameEmailCurrency,
} from './user.types';

export const UserService = {
	// ─── Layout / Session ──────────────────────────────────────────────

	/**
	 * Fetch fields needed by the authenticated layout: sidebar user info,
	 * currency provider, and changelog badge.
	 */
	async getForLayout(userId: string): Promise<UserForLayout | null> {
		return prisma.user.findUnique({
			where: { id: userId },
			select: {
				name: true,
				email: true,
				currency: true,
				role: true,
				lastSeenChangelogAt: true,
			},
		});
	},

	// ─── Currency ──────────────────────────────────────────────────────

	/**
	 * Return the user's currency string (e.g. "USD", "PHP").
	 * Throws if user not found.
	 */
	async getCurrency(userId: string): Promise<string> {
		const row = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { currency: true },
		});
		return row.currency;
	},

	// ─── Profile ───────────────────────────────────────────────────────

	/**
	 * Full profile data for the profile page, including linked OAuth providers.
	 * Throws if user not found.
	 */
	async getProfile(userId: string): Promise<UserProfile> {
		return prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				password: true,
				phoneNumber: true,
				emailNotificationsEnabled: true,
				notificationEmail: true,
				businessName: true,
				businessAddress: true,
				businessTaxId: true,
				paymentInstructions: true,
				createdAt: true,
				authAccounts: {
					select: {
						provider: true,
						providerAccountId: true,
					},
				},
			},
		});
	},

	// ─── Reporting ─────────────────────────────────────────────────────

	/**
	 * Email and account creation date for the reports page.
	 * Throws if user not found.
	 */
	async getEmailAndCreatedAt(userId: string): Promise<UserEmailAndCreatedAt> {
		return prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { email: true, createdAt: true },
		});
	},

	// ─── Notification helpers ──────────────────────────────────────────

	/**
	 * Email and name, used for sending notification emails.
	 * Throws if user not found.
	 */
	async getEmailAndName(userId: string): Promise<UserEmailAndName> {
		return prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { email: true, name: true },
		});
	},

	/**
	 * Phone number only, retained for the future SMS notification integration.
	 * Throws if user not found.
	 */
	async getPhoneNumber(userId: string): Promise<string | null> {
		const row = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { phoneNumber: true },
		});
		return row.phoneNumber;
	},

	/**
	 * Name, email, and currency for monthly digest generation.
	 * Throws if user not found.
	 */
	async getNameEmailCurrency(userId: string): Promise<UserNameEmailCurrency> {
		return prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { name: true, email: true, currency: true },
		});
	},

	// ─── Changelog ─────────────────────────────────────────────────────

	/**
	 * Mark the changelog as seen (set lastSeenChangelogAt to now).
	 */
	async markChangelogSeen(userId: string, date: Date): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { lastSeenChangelogAt: date },
		});
	},

	// ─── Lookups ───────────────────────────────────────────────────────

	/**
	 * Find a user by ID, returning only { id }.
	 * Returns null if not found.
	 */
	async findById(userId: string): Promise<{ id: string } | null> {
		return prisma.user.findUnique({
			where: { id: userId },
			select: { id: true },
		});
	},

	/**
	 * Check whether a user has a password set (for admin reauth dialog, provider disconnect).
	 */
	async getHasPassword(userId: string): Promise<boolean> {
		const row = await prisma.user.findUnique({
			where: { id: userId },
			select: { password: true },
		});
		return !!row?.password;
	},

	/**
	 * Get the user's hashed password (for password verification flows).
	 * Throws if user not found.
	 */
	async getPassword(userId: string): Promise<string | null> {
		const row = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { password: true },
		});
		return row.password;
	},

	// ─── Profile mutations (used by notification controller) ──────────

	/**
	 * Update user's phone number.
	 */
	async updatePhoneNumber(userId: string, phoneNumber: string | null): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { phoneNumber },
		});
	},

	// ─── Email notification controls ──────────────────────────────────

	/**
	 * Master gate: whether the user wants any notification email at all.
	 * Throws if user not found.
	 */
	async getEmailNotificationsEnabled(userId: string): Promise<boolean> {
		const row = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: { emailNotificationsEnabled: true },
		});
		return row.emailNotificationsEnabled;
	},

	/**
	 * Flip the master email-notifications gate.
	 */
	async setEmailNotificationsEnabled(
		userId: string,
		enabled: boolean
	): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { emailNotificationsEnabled: enabled },
		});
	},

	/**
	 * Set the delivery email override. If the value equals the account
	 * email (case-insensitive, trimmed), store null instead so the field
	 * keeps "follows account email" behavior.
	 */
	async setNotificationEmail(
		userId: string,
		email: string | null
	): Promise<void> {
		let value = email;
		if (value !== null) {
			const account = await prisma.user.findUniqueOrThrow({
				where: { id: userId },
				select: { email: true },
			});
			if (value.trim().toLowerCase() === account.email.trim().toLowerCase()) {
				value = null;
			}
		}

		await prisma.user.update({
			where: { id: userId },
			data: { notificationEmail: value },
		});
	},

	/**
	 * Single choke-point: resolve where a notification email should go.
	 * Returns null when the master gate is off (suppress email); otherwise
	 * the delivery override or, falling back, the account email.
	 * Throws if user not found.
	 */
	async resolveNotificationRecipient(userId: string): Promise<string | null> {
		const u = await prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				email: true,
				emailNotificationsEnabled: true,
				notificationEmail: true,
			},
		});
		if (!u.emailNotificationsEnabled) return null;
		return u.notificationEmail ?? u.email;
	},

	/**
	 * Update user's display name.
	 */
	async updateName(userId: string, name: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { name },
		});
	},

	/**
	 * Update user's business / freelancer profile (invoice sender identity).
	 */
	async updateBusinessProfile(
		userId: string,
		data: {
			businessName: string | null;
			businessAddress: string | null;
			businessTaxId: string | null;
			paymentInstructions: string | null;
		}
	): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: {
				businessName: data.businessName,
				businessAddress: data.businessAddress,
				businessTaxId: data.businessTaxId,
				paymentInstructions: data.paymentInstructions,
			},
		});
	},

	/**
	 * Update user's hashed password.
	 */
	async updatePassword(userId: string, hashedPassword: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword },
		});
	},

	// ─── Onboarding ────────────────────────────────────────────────────

	/**
	 * Check whether the user has completed onboarding.
	 */
	async getIsOnboarded(userId: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { isOnboarded: true },
		});
		if (!user) throw new Error('User not found');
		return user.isOnboarded;
	},

	/**
	 * Set the user's currency (only allowed before onboarding is complete).
	 */
	async setCurrency(userId: string, currency: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { currency },
		});
	},

	/**
	 * Mark onboarding as complete.
	 */
	async completeOnboarding(userId: string): Promise<void> {
		await prisma.user.update({
			where: { id: userId },
			data: { isOnboarded: true },
		});
	},
};
