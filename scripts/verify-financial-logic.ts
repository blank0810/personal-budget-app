import { PrismaClient, AccountType, CategoryType } from '@prisma/client';
import { DashboardService } from '../server/modules/dashboard/dashboard.service';

const prisma = new PrismaClient();

async function main() {
	console.log('Starting Financial Logic Verification...');

	// 1. Setup Test User
	const user = await prisma.user.create({
		data: {
			email: `test_verify_${Date.now()}@example.com`,
			name: 'Verification User',
			password: 'password123',
		},
	});
	console.log(`Created User: ${user.id}`);

	try {
		// 2. Setup Accounts (Asset vs Liability)
		const savings = await prisma.account.create({
			data: {
				userId: user.id,
				name: 'Test Savings',
				type: AccountType.SAVINGS,
				balance: 1000,
				// @ts-ignore
				isLiability: false,
			},
		});

		const creditCard = await prisma.account.create({
			data: {
				userId: user.id,
				name: 'Test Credit Card',
				type: AccountType.CREDIT,
				balance: 500,
				// @ts-ignore
				isLiability: true, // Key Test
			},
		});
		console.log('Created Accounts: Savings (Asset) and CC (Liability)');

		// 3. Setup Categories
		const incomeCategory = await prisma.category.create({
			data: {
				userId: user.id,
				name: 'Salary',
				type: CategoryType.INCOME,
			},
		});
		const transferCategory = await prisma.category.create({
			data: {
				userId: user.id,
				name: 'Credit Card Payment',
				type: CategoryType.EXPENSE,
			},
		});

		// 4. Test Net Worth Logic
		// Asset (1000) - Liability (500) = 500
		const netWorth = await DashboardService.getNetWorth(user.id);
		console.log(`Net Worth Check: Expected 500, Got ${netWorth.netWorth}`);
		if (netWorth.netWorth !== 500)
			throw new Error('Net Worth calculation incorrect');

		// 5. Test Debt Paydown Logic
		// Create a transfer FROM Savings TO Credit Card (Liability)
		await prisma.transfer.create({
			data: {
				userId: user.id,
				amount: 200,
				date: new Date(),
				fromAccountId: savings.id,
				toAccountId: creditCard.id,
			},
		});

		// Simulate logic that DashboardService uses (aggregate transfers to liability accounts)
		// Note: We need to check if DashboardService.getFinancialHealthMetrics picks this up
		const metrics = await DashboardService.getFinancialHealthMetrics(
			user.id
		);

		console.log(
			`Debt Paydown Check: Expected 200, Got ${metrics.debtPaydown}`
		);
		if (metrics.debtPaydown !== 200)
			throw new Error('Debt Paydown calculation incorrect');

		console.log('✅ All Financial Logic Checks Passed!');
	} catch (error) {
		console.error('❌ Verification Failed:', error);
	} finally {
		// Cleanup
		await prisma.user.delete({ where: { id: user.id } });
		await prisma.$disconnect();
	}
}

main();
