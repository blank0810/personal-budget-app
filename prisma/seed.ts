import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../server/modules/notification/notification.service';
import bcrypt from 'bcryptjs';
import { computeNextRunAt } from '../server/modules/automation/automation.service';
import { AUTOMATION_JOBS } from '../server/modules/automation/registry';

const prisma = new PrismaClient();

async function main() {
	const email = 'admin@budget-app.com';
	const password = 'password';
	const hashedPassword = await bcrypt.hash(password, 10);

	const user = await prisma.user.upsert({
		where: { email },
		update: {},
		create: {
			email,
			name: 'Admin User',
			password: hashedPassword,
			role: 'ADMIN',
			isOnboarded: true,
			currency: 'PHP',
			accounts: {
				create: [
					{ name: 'Main Bank', type: 'BANK', balance: 5000 },
					{ name: 'Cash Wallet', type: 'CASH', balance: 200 },
					{ name: 'Savings', type: 'SAVINGS', balance: 10000 },
					{ name: 'Emergency Savings', type: 'SAVINGS', balance: 3500 },
					{ name: 'Tithes', type: 'TITHE', balance: 0 },
				],
			},
			categories: {
				create: [
					// Income Categories
					{
						name: 'Salary',
						type: 'INCOME',
						color: '#16a34a',
						icon: 'Briefcase',
					},
					{
						name: 'Freelance',
						type: 'INCOME',
						color: '#2563eb',
						icon: 'Laptop',
					},
					{
						name: 'Investment',
						type: 'INCOME',
						color: '#ca8a04',
						icon: 'TrendingUp',
					},
					// Expense Categories
					{
						name: 'Housing',
						type: 'EXPENSE',
						color: '#dc2626',
						icon: 'Home',
					},
					{
						name: 'Food',
						type: 'EXPENSE',
						color: '#ea580c',
						icon: 'Utensils',
					},
					{
						name: 'Transportation',
						type: 'EXPENSE',
						color: '#9333ea',
						icon: 'Car',
					},
					{
						name: 'Utilities',
						type: 'EXPENSE',
						color: '#0891b2',
						icon: 'Zap',
					},
					{
						name: 'Entertainment',
						type: 'EXPENSE',
						color: '#db2777',
						icon: 'Film',
					},
				],
			},
		},
	});

	console.log({ user });

	// Seed notification types from the code-side registry, which is the single
	// source of truth (server/modules/notification/notification.registry.ts).
	// syncTypes() also protects users from a default flipping true -> false by
	// writing explicit opt-in rows first, so this is safe to run on every deploy.
	const notificationSync = await NotificationService.syncTypes();
	console.log(
		`Seeded ${notificationSync.synced} notification types` +
			(notificationSync.preserved > 0
				? ` (preserved ${notificationSync.preserved} implicit opt-ins before a default flip)`
				: '')
	);

	// Seed default feature flags
	const featureFlags = [
		{ key: 'csv_import', enabled: true, description: 'CSV transaction import' },
		{ key: 'goals', enabled: true, description: 'Savings goals' },
		{ key: 'invoices', enabled: true, description: 'Invoicing module (clients, entries, invoices)' },
		{ key: 'ai_features', enabled: false, description: 'AI-powered features (coming soon)' },
		{ key: 'bulk_pdf_export', enabled: false, description: 'Bulk PDF report export (premium)' },
		{ key: 'bulk_actions', enabled: false, description: 'Bulk delete / categorize on the /transactions table (v1.9.12 pilot)' },
	];

	for (const flag of featureFlags) {
		await prisma.featureFlag.upsert({
			where: { key: flag.key },
			update: { description: flag.description },
			create: flag,
		});
	}

	console.log('Seeded feature flags');

	// Grant admin user all features explicitly
	const seededUserForFeatures = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (seededUserForFeatures) {
		for (const flag of featureFlags) {
			await prisma.userFeature.upsert({
				where: {
					userId_flagKey: {
						userId: seededUserForFeatures.id,
						flagKey: flag.key,
					},
				},
				update: { enabled: true },
				create: {
					userId: seededUserForFeatures.id,
					flagKey: flag.key,
					enabled: true,
				},
			});
		}
		console.log('Seeded admin user feature overrides');
	}

	// Seed default system settings
	const systemSettings = [
		{ key: 'invoice_due_days', value: '30', label: 'Default invoice due date (days from issue)' },
		// Recipient for feature-request notifications. Replaces the old
		// SMTP_USER-derived address, which disappeared with Gmail SMTP.
		// Empty means "fall back to ADMIN_NOTIFICATION_EMAIL, else skip".
		{ key: 'admin_notification_email', value: '', label: 'Admin email for feature-request notifications' },
	];

	for (const setting of systemSettings) {
		await prisma.systemSetting.upsert({
			where: { key: setting.key },
			update: { label: setting.label },
			create: setting,
		});
	}
	console.log('Seeded system settings');

	// Seed system-wide automation schedules. PostgreSQL permits duplicate NULLs
	// in a compound unique index, and Prisma cannot pass null through the
	// generated jobKey_userId unique input. Resolve the nullable compound key
	// first, then use a stable id for a genuinely idempotent Prisma upsert.
	const automationSeededAt = new Date();
	for (const job of AUTOMATION_JOBS) {
		const existing = await prisma.automationSchedule.findFirst({
			where: { jobKey: job.jobKey, userId: null },
			select: { id: true },
		});

		const nextRunAt = computeNextRunAt(
			job.defaultCadence,
			automationSeededAt
		);

		await prisma.automationSchedule.upsert({
			where: {
				id: existing?.id ?? `system-${job.jobKey}`,
			},
			// Preserve any cadence or enabled-state changes made by an admin.
			update: {},
			create: {
				id: `system-${job.jobKey}`,
				jobKey: job.jobKey,
				userId: null,
				...job.defaultCadence,
				nextRunAt,
			},
		});
	}
	console.log('Seeded automation schedules');

	// Seed sample goals
	const seededUser = await prisma.user.findUnique({
		where: { email },
		include: { accounts: true },
	});

	if (seededUser) {
		const emergencySavings = seededUser.accounts.find((a) => a.name === 'Emergency Savings');

		if (emergencySavings) {
			await prisma.goal.upsert({
				where: { id: 'seed_goal_emergency' },
				update: {},
				create: {
					id: 'seed_goal_emergency',
					name: 'Emergency Fund',
					targetAmount: 0,
					currentAmount: 3500,
					goalType: 'MONTHS_COVERAGE',
					isEmergencyFund: true,
					thresholdLow: 2,
					thresholdMid: 4,
					thresholdHigh: 6,
					icon: 'shield',
					color: 'blue',
					status: 'ACTIVE',
					linkedAccountId: emergencySavings.id,
					userId: seededUser.id,
				},
			});
		}

		await prisma.goal.upsert({
			where: { id: 'seed_goal_laptop' },
			update: {},
			create: {
				id: 'seed_goal_laptop',
				name: 'New Laptop',
				targetAmount: 50000,
				currentAmount: 12000,
				goalType: 'FIXED_AMOUNT',
				isEmergencyFund: false,
				icon: 'target',
				color: 'purple',
				status: 'ACTIVE',
				deadline: new Date('2026-12-31'),
				userId: seededUser.id,
			},
		});

		console.log('Seeded goals');
	}
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
