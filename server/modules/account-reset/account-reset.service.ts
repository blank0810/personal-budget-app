import { randomBytes, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const HMAC_KEY = process.env.NEXTAUTH_SECRET ?? 'fallback-secret';

function hmacHash(token: string): string {
	return createHmac('sha256', HMAC_KEY).update(token).digest('hex');
}

export const AccountResetService = {
	/**
	 * Verify user password and generate a reset confirmation token.
	 * Returns the raw token (caller must pass it back in executeReset).
	 * Stores HMAC-hashed version + 5-min expiry on User record.
	 */
	async verifyForReset(userId: string, password: string) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { password: true },
		});

		if (!user?.password) {
			throw new Error(
				'No password set on this account. Set a password first.'
			);
		}

		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			throw new Error('Incorrect password');
		}

		const rawToken = randomBytes(32).toString('hex');
		const hashedToken = hmacHash(rawToken);

		await prisma.user.update({
			where: { id: userId },
			data: {
				resetConfirmToken: hashedToken,
				resetConfirmExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
			},
		});

		return rawToken;
	},

	/**
	 * Execute the financial data reset after validating the confirmation token
	 * and the typed confirmation phrase.
	 *
	 * Tier 'transactions': Delete all transactions, zero account balances.
	 *   Keeps accounts, categories, goals.
	 * Tier 'full': Delete everything including accounts, categories, goals.
	 *   Sets isOnboarded = false.
	 */
	async executeReset(
		userId: string,
		token: string,
		confirmationPhrase: string,
		tier: 'transactions' | 'full'
	) {
		if (confirmationPhrase !== 'DELETE ALL DATA') {
			throw new Error('Confirmation phrase does not match');
		}

		// Validate token
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { resetConfirmToken: true, resetConfirmExpiresAt: true },
		});

		if (!user?.resetConfirmToken || !user.resetConfirmExpiresAt) {
			throw new Error('No reset token found. Please verify again.');
		}

		if (new Date() > user.resetConfirmExpiresAt) {
			// Clear expired token
			await prisma.user.update({
				where: { id: userId },
				data: {
					resetConfirmToken: null,
					resetConfirmExpiresAt: null,
				},
			});
			throw new Error('Reset token has expired. Please verify again.');
		}

		const hashedToken = hmacHash(token);
		if (hashedToken !== user.resetConfirmToken) {
			throw new Error('Invalid reset token. Please verify again.');
		}

		// Execute deletion in a transaction with 30s timeout
		await prisma.$transaction(
			async (tx) => {
				// 1. GoalContribution (FK -> Goal)
				await tx.goalContribution.deleteMany({
					where: {
						goal: { userId },
					},
				});

				// 2. Expense (FK -> Category:Restrict, Budget:SetNull, Account:SetNull)
				await tx.expense.deleteMany({
					where: { userId },
				});

				// 3. Income (FK -> Category:Restrict, Account:SetNull)
				await tx.income.deleteMany({
					where: { userId },
				});

				// 4. Transfer (FK -> Account:Restrict)
				await tx.transfer.deleteMany({
					where: { userId },
				});

				// 5. Budget (FK -> Category:Restrict)
				await tx.budget.deleteMany({
					where: { userId },
				});

				// 6. RecurringTransaction (FK -> Category:Restrict, Account:SetNull)
				await tx.recurringTransaction.deleteMany({
					where: { userId },
				});

				// 7. MonthlyReport (standalone)
				await tx.monthlyReport.deleteMany({
					where: { userId },
				});

				if (tier === 'full') {
					// 8. Goal (FK -> Account:SetNull)
					await tx.goal.deleteMany({
						where: { userId },
					});

					// 9. Account
					await tx.account.deleteMany({
						where: { userId },
					});

					// 10. Category
					await tx.category.deleteMany({
						where: { userId },
					});

					// Set isOnboarded = false for full reset
					await tx.user.update({
						where: { id: userId },
						data: {
							isOnboarded: false,
							resetConfirmToken: null,
							resetConfirmExpiresAt: null,
						},
					});
				} else {
					// Zero all account balances for transaction reset
					await tx.account.updateMany({
						where: { userId },
						data: { balance: 0 },
					});

					// Reset goal currentAmount and baselineAmount
					await tx.goal.updateMany({
						where: { userId },
						data: {
							currentAmount: 0,
							baselineAmount: 0,
						},
					});

					// Clear the token
					await tx.user.update({
						where: { id: userId },
						data: {
							resetConfirmToken: null,
							resetConfirmExpiresAt: null,
						},
					});
				}
			},
			{
				timeout: 30000,
			}
		);
	},

	/**
	 * Export all financial data for the user as a JSON-serializable object.
	 */
	async exportUserData(userId: string) {
		const [accounts, incomes, expenses, transfers, budgets, goals, categories] =
			await Promise.all([
				prisma.account.findMany({
					where: { userId },
					include: {
						goals: {
							select: {
								id: true,
								name: true,
								targetAmount: true,
								currentAmount: true,
								status: true,
							},
						},
					},
				}),
				prisma.income.findMany({
					where: { userId },
					include: {
						category: { select: { name: true, type: true } },
						account: { select: { name: true, type: true } },
					},
				}),
				prisma.expense.findMany({
					where: { userId },
					include: {
						category: { select: { name: true, type: true } },
						account: { select: { name: true, type: true } },
						budget: { select: { name: true } },
					},
				}),
				prisma.transfer.findMany({
					where: { userId },
					include: {
						fromAccount: { select: { name: true, type: true } },
						toAccount: { select: { name: true, type: true } },
					},
				}),
				prisma.budget.findMany({
					where: { userId },
					include: {
						category: { select: { name: true, type: true } },
					},
				}),
				prisma.goal.findMany({
					where: { userId },
					include: {
						linkedAccount: { select: { name: true, type: true } },
						contributions: true,
					},
				}),
				prisma.category.findMany({
					where: { userId },
				}),
			]);

		return {
			exportedAt: new Date().toISOString(),
			accounts,
			incomes,
			expenses,
			transfers,
			budgets,
			goals,
			categories,
		};
	},
};
