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

	// Mark seed user as onboarded and set as ADMIN
	await prisma.user.update({
		where: { email },
		data: { isOnboarded: true, role: 'ADMIN' },
	});

	console.log('Set seed user as onboarded ADMIN');

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
