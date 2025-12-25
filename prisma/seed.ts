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
