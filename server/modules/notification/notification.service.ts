import prisma from '@/lib/prisma';
import { NotificationChannel } from '@prisma/client';
import { EmailService } from '@/server/modules/email/email.service';
import { UserService } from '@/server/modules/user/user.service';
import { formatCurrency } from '@/lib/formatters';
import { addSmsJob } from './sms.queue';
import {
	MergedPreference,
	getBudgetRoastSms,
	getIncomeRoastSms,
	getReportRoastSms,
} from './notification.types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const NotificationService = {
	/**
	 * Get all notification preferences for a user, merged with defaults (per channel)
	 */
	async getPreferencesForUser(userId: string): Promise<MergedPreference[]> {
		const types = await prisma.notificationType.findMany({
			include: {
				userPreferences: {
					where: { userId },
				},
			},
			orderBy: { category: 'asc' },
		});

		return types.map((type) => {
			const emailPref = type.userPreferences.find(
				(p) => p.channel === 'EMAIL'
			);
			const smsPref = type.userPreferences.find(
				(p) => p.channel === 'SMS'
			);

			return {
				key: type.key,
				label: type.label,
				description: type.description,
				category: type.category,
				emailEnabled:
					emailPref != null ? emailPref.enabled : type.defaultEnabled,
				smsEnabled: smsPref != null ? smsPref.enabled : false,
			};
		});
	},

	/**
	 * Update a single notification preference for a user (per channel)
	 */
	async updatePreference(
		userId: string,
		key: string,
		enabled: boolean,
		channel: NotificationChannel = 'EMAIL'
	): Promise<void> {
		const type = await prisma.notificationType.findUniqueOrThrow({
			where: { key },
		});

		await prisma.userNotificationPreference.upsert({
			where: {
				userId_notificationTypeId_channel: {
					userId,
					notificationTypeId: type.id,
					channel,
				},
			},
			update: { enabled },
			create: {
				userId,
				notificationTypeId: type.id,
				channel,
				enabled,
			},
		});
	},

	/**
	 * Quick check if a notification type is enabled for a user on a specific channel
	 */
	async isEnabled(
		userId: string,
		key: string,
		channel: NotificationChannel = 'EMAIL'
	): Promise<boolean> {
		const type = await prisma.notificationType.findUnique({
			where: { key },
			include: {
				userPreferences: {
					where: { userId, channel },
				},
			},
		});

		if (!type) return false;

		if (type.userPreferences.length > 0) {
			return type.userPreferences[0].enabled;
		}

		// Default: email uses defaultEnabled, SMS defaults to false
		return channel === 'EMAIL' ? type.defaultEnabled : false;
	},

	/**
	 * Send a budget alert when threshold is crossed (email + SMS)
	 */
	async sendBudgetAlert(
		userId: string,
		budget: { id: string; name: string; amount: number },
		spent: number,
		prevPercentage: number,
		newPercentage: number
	): Promise<void> {
		// Fetch user's currency preference
		const currency = await UserService.getCurrency(userId);

		// Determine which threshold was crossed
		let subject: string;
		let headline: string;
		let color: string;
		let message: string;
		const remaining = Math.max(0, budget.amount - spent);

		if (prevPercentage < 100 && newPercentage >= 100) {
			subject = `Budget Exceeded: ${budget.name}`;
			headline = 'Budget Exceeded';
			color = '#DC2626';
			message = `Your budget "${budget.name}" has exceeded its limit. You've spent ${formatCurrency(spent, { currency })} of your ${formatCurrency(budget.amount, { currency })} budget (${newPercentage.toFixed(0)}%).`;
		} else if (prevPercentage < 80 && newPercentage >= 80) {
			subject = `Budget Warning: ${budget.name} at ${newPercentage.toFixed(0)}%`;
			headline = 'Budget Warning';
			color = '#D97706';
			message = `Your budget "${budget.name}" has reached ${newPercentage.toFixed(0)}%. You've spent ${formatCurrency(spent, { currency })} of your ${formatCurrency(budget.amount, { currency })} budget with ${formatCurrency(remaining, { currency })} remaining.`;
		} else {
			return;
		}

		const budgetUrl = `${APP_URL}/budgets`;

		// --- Email path ---
		const emailEnabled = await this.isEnabled(userId, 'budget_alerts', 'EMAIL');
		if (emailEnabled) {
			const user = await UserService.getEmailAndName(userId);

			const html = `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
					<div style="padding: 32px 24px; border-bottom: 3px solid #0D9488;">
						<h1 style="margin: 0; font-size: 20px; color: #0D9488;">Budget Planner</h1>
					</div>
					<div style="padding: 32px 24px;">
						<h2 style="margin: 0 0 16px; font-size: 22px; color: ${color};">${headline}</h2>
						<p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
							Hi ${user.name || 'there'},
						</p>
						<p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
							${message}
						</p>
						<div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
							<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Budget</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${budget.name}</td>
								</tr>
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Limit</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(budget.amount, { currency })}</td>
								</tr>
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Spent</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${color};">${formatCurrency(spent, { currency })}</td>
								</tr>
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Remaining</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(remaining, { currency })}</td>
								</tr>
							</table>
						</div>
						<a href="${budgetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0D9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
							View Budget
						</a>
					</div>
					<div style="padding: 16px 24px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF;">
						You received this because budget alerts are enabled. <a href="${APP_URL}/profile" style="color: #0D9488;">Manage preferences</a>
					</div>
				</div>
			`;

			await EmailService.send({ to: user.email, subject, html });
		}

		// --- SMS path ---
		const smsEnabled = await this.isEnabled(userId, 'budget_alerts', 'SMS');
		if (smsEnabled) {
			const phoneNumber = await UserService.getPhoneNumber(userId);

			if (phoneNumber) {
				const smsMessage = getBudgetRoastSms(
					budget.name,
					newPercentage,
					spent,
					budget.amount
				);
				await addSmsJob(phoneNumber, smsMessage);
			}
		}
	},

	/**
	 * Send an income notification (email + SMS)
	 */
	async sendIncomeNotification(
		userId: string,
		income: { amount: number; description: string | null; categoryName: string },
		account: { name: string; newBalance: number } | null,
		deductions?: {
			tithe?: { amount: number; percentage: number };
			emergencyFund?: { amount: number; percentage: number };
		}
	): Promise<void> {
		// Fetch user's currency preference
		const currency = await UserService.getCurrency(userId);

		// --- Email path ---
		const emailEnabled = await this.isEnabled(userId, 'income_notifications', 'EMAIL');
		if (emailEnabled) {
			const user = await UserService.getEmailAndName(userId);

			const subject = `Income Received: ${formatCurrency(income.amount, { currency })}`;

			const html = `
				<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
					<div style="padding: 32px 24px; border-bottom: 3px solid #0D9488;">
						<h1 style="margin: 0; font-size: 20px; color: #0D9488;">Budget Planner</h1>
					</div>
					<div style="padding: 32px 24px;">
						<h2 style="margin: 0 0 16px; font-size: 22px; color: #059669;">Income Received</h2>
						<p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
							Hi ${user.name || 'there'},
						</p>
						<p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
							An income of <strong>${formatCurrency(income.amount, { currency })}</strong> has been recorded${income.description ? ` for "${income.description}"` : ''}.
						</p>
						<div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
							<table style="width: 100%; border-collapse: collapse; font-size: 14px;">
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Amount</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(income.amount, { currency })}</td>
								</tr>
								${deductions?.tithe ? `
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Church Tithe (${deductions.tithe.percentage}%)</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #DC2626;">-${formatCurrency(deductions.tithe.amount, { currency })}</td>
								</tr>
								` : ''}
								${deductions?.emergencyFund ? `
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Emergency Fund (${deductions.emergencyFund.percentage}%)</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #DC2626;">-${formatCurrency(deductions.emergencyFund.amount, { currency })}</td>
								</tr>
								` : ''}
								${deductions ? `
								<tr>
									<td style="padding: 8px 0; border-top: 1px solid #E5E7EB; color: #6B7280;">Net to Account</td>
									<td style="padding: 8px 0; border-top: 1px solid #E5E7EB; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(income.amount - (deductions.tithe?.amount ?? 0) - (deductions.emergencyFund?.amount ?? 0), { currency })}</td>
								</tr>
								` : ''}
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Category</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${income.categoryName}</td>
								</tr>
								${account ? `
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">Account</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${account.name}</td>
								</tr>
								<tr>
									<td style="padding: 8px 0; color: #6B7280;">New Balance</td>
									<td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(account.newBalance, { currency })}</td>
								</tr>
								` : ''}
							</table>
						</div>
						<a href="${APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #0D9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
							View Dashboard
						</a>
					</div>
					<div style="padding: 16px 24px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF;">
						You received this because income notifications are enabled. <a href="${APP_URL}/profile" style="color: #0D9488;">Manage preferences</a>
					</div>
				</div>
			`;

			await EmailService.send({ to: user.email, subject, html });
		}

		// --- SMS path ---
		const smsEnabled = await this.isEnabled(userId, 'income_notifications', 'SMS');
		if (smsEnabled) {
			const phoneNumber = await UserService.getPhoneNumber(userId);

			if (phoneNumber) {
				const smsMessage = getIncomeRoastSms(
					income.amount,
					income.categoryName,
					account?.name ?? null,
					account?.newBalance ?? null
				);
				await addSmsJob(phoneNumber, smsMessage);
			}
		}
	},

	/**
	 * Send a monthly report SMS summary (called after email delivery)
	 */
	async sendMonthlyReportSms(
		userId: string,
		month: string,
		healthScore: number,
		netAmount: number
	): Promise<void> {
		const smsEnabled = await this.isEnabled(userId, 'monthly_report', 'SMS');
		if (!smsEnabled) return;

		const phoneNumber = await UserService.getPhoneNumber(userId);

		if (!phoneNumber) return;

		const smsMessage = getReportRoastSms(month, healthScore, netAmount);
		await addSmsJob(phoneNumber, smsMessage);
	},
};
