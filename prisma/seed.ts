import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	const email = 'admin@budget.app';
	const password = 'admin123';
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
					{ name: 'Savings', type: 'BANK', balance: 10000 },
					{ name: 'Tithes', type: 'CASH', balance: 0 },
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

	// Seed notification types
	const notificationTypes = [
		{
			id: 'nt_monthly_report',
			key: 'monthly_report',
			label: 'Monthly Financial Report',
			description: 'Receive a PDF financial digest on the 1st of each month',
			category: 'reports',
			defaultEnabled: true,
		},
		{
			id: 'nt_budget_alerts',
			key: 'budget_alerts',
			label: 'Budget Alerts',
			description: 'Get notified when a budget reaches 80% or exceeds 100%',
			category: 'alerts',
			defaultEnabled: true,
		},
		{
			id: 'nt_income_notifications',
			key: 'income_notifications',
			label: 'Income Notifications',
			description: 'Get notified when income is recorded to your account',
			category: 'activity',
			defaultEnabled: true,
		},
	];

	for (const nt of notificationTypes) {
		await prisma.notificationType.upsert({
			where: { key: nt.key },
			update: { label: nt.label, description: nt.description, category: nt.category, defaultEnabled: nt.defaultEnabled },
			create: nt,
		});
	}

	console.log('Seeded notification types');

	// Seed default feature flags
	const featureFlags = [
		{ key: 'recurring_transactions', enabled: true, description: 'Recurring transaction automation' },
		{ key: 'csv_import', enabled: true, description: 'CSV transaction import' },
		{ key: 'goals', enabled: true, description: 'Savings goals' },
		{ key: 'ai_features', enabled: false, description: 'AI-powered features (coming soon)' },
	];

	for (const flag of featureFlags) {
		await prisma.featureFlag.upsert({
			where: { key: flag.key },
			update: { description: flag.description },
			create: flag,
		});
	}

	console.log('Seeded feature flags');

	// Seed sample recurring transaction
	const seededUser = await prisma.user.findUnique({
		where: { email },
		include: { categories: true, accounts: true },
	});

	if (seededUser) {
		const salaryCategory = seededUser.categories.find((c) => c.name === 'Salary');
		const mainBank = seededUser.accounts.find((a) => a.name === 'Main Bank');

		if (salaryCategory && mainBank) {
			await prisma.recurringTransaction.upsert({
				where: { id: 'seed_recurring_salary' },
				update: {},
				create: {
					id: 'seed_recurring_salary',
					name: 'Monthly Salary',
					type: 'INCOME',
					amount: 5000,
					frequency: 'MONTHLY',
					startDate: new Date('2026-01-01'),
					nextRunDate: new Date('2026-04-01'),
					isActive: true,
					categoryId: salaryCategory.id,
					accountId: mainBank.id,
					userId: seededUser.id,
				},
			});
			console.log('Seeded recurring transaction');
		}

		// Seed sample goal
		await prisma.goal.upsert({
			where: { id: 'seed_goal_emergency' },
			update: {},
			create: {
				id: 'seed_goal_emergency',
				name: 'Emergency Fund',
				targetAmount: 10000,
				currentAmount: 3500,
				icon: 'shield',
				color: 'emerald',
				status: 'ACTIVE',
				deadline: new Date('2026-12-31'),
				userId: seededUser.id,
			},
		});
		console.log('Seeded goal');
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
