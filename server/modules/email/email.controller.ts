'use server';

import { EmailPriority, IntegrationProvider } from '@prisma/client';
import { requireAdminSession } from '@/server/lib/auth-guard';
import { invalidateTags } from '@/server/actions/cache';
import { CACHE_TAGS } from '@/server/lib/cache-tags';
import type { ActionResponse } from '@/server/lib/action-types';
import { UserService } from '@/server/modules/user/user.service';
import { NotificationService } from '@/server/modules/notification/notification.service';
import {
	EmailConfigService,
	getEmailConfig,
	requireEmailConfig,
} from './email.config';
import { getQuotaStatus } from './email.quota';
import { getProvider } from './providers/registry';
import { EmailService } from './email.service';
import {
	sendTestEmailSchema,
	updateEmailConfigSchema,
} from './email.types';

/**
 * Admin server actions for the email provider integration.
 *
 * Every action is gated on an ADMIN role plus a live sudo window. Credentials are
 * write-only across this boundary: nothing here ever returns a stored key, not
 * even masked — only whether one exists.
 */

/** Current provider config for the admin panel, plus today's quota usage. */
export async function adminGetEmailConfigAction() {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const [config, quota] = await Promise.all([
			EmailConfigService.getForAdmin(),
			getQuotaStatus(),
		]);

		return { success: true as const, data: { ...config, quota } };
	} catch (err) {
		console.error('Failed to load email config:', err);
		return { error: 'Failed to load email configuration' };
	}
}

/**
 * Save a provider config, activate it, and immediately verify the credential so
 * the admin learns about a bad key here rather than from a silently dropped
 * password reset later.
 */
export async function adminUpdateEmailConfigAction(
	data: unknown
): Promise<ActionResponse<{ verified: boolean; message: string }>> {
	const { error } = await requireAdminSession();
	if (error) return { error };

	const parsed = updateEmailConfigSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	const { provider, fromEmail, fromName, apiKey, replyToEmail } = parsed.data;

	try {
		await EmailConfigService.upsert({
			provider: provider as IntegrationProvider,
			fromEmail,
			fromName,
			replyToEmail: replyToEmail || null,
			// Blank is dropped and merged over the stored value, so leaving the field
			// untouched keeps the existing key.
			apiKey,
		});

		const config = await requireEmailConfig();
		const result = await getProvider(config.provider).verify(config);
		await EmailConfigService.recordVerification(config.provider, result);

		invalidateTags(CACHE_TAGS.ADMIN);
		invalidateTags(CACHE_TAGS.EMAIL_CONFIG);

		return {
			success: true as const,
			data: { verified: result.ok, message: result.message },
		};
	} catch (err) {
		console.error('Failed to save email config:', err);
		return {
			error:
				err instanceof Error
					? err.message
					: 'Failed to save email configuration',
		};
	}
}

/**
 * Send a real email through the active provider.
 *
 * CRITICAL priority so a spent daily quota cannot make a working setup look
 * broken. Defaults to the admin's own address; an explicit recipient is allowed
 * because verifying deliverability to an external mailbox is the whole point.
 */
export async function adminSendTestEmailAction(
	data: unknown
): Promise<ActionResponse<{ sentTo: string }>> {
	const { error, userId } = await requireAdminSession();
	if (error) return { error };

	const parsed = sendTestEmailSchema.safeParse(data);
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Validation failed' };
	}

	try {
		const config = await getEmailConfig();
		if (!config) {
			return { error: 'Save a provider configuration first.' };
		}

		const admin = await UserService.getEmailAndName(userId);
		const to = parsed.data.to || admin.email;

		await EmailService.send({
			to,
			subject: 'Budget Planner — email delivery test',
			html: `
				<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
					<h2>Email delivery is working</h2>
					<p>This test was sent from Budget Planner's admin panel.</p>
					<table style="font-size: 14px; border-collapse: collapse;">
						<tr><td style="padding: 4px 12px 4px 0;">Provider</td><td><strong>${config.provider}</strong></td></tr>
						<tr><td style="padding: 4px 12px 4px 0;">From</td><td><strong>${config.fromEmail}</strong></td></tr>
					</table>
					<p style="color: #6b7280; font-size: 13px;">If you received this, transactional email is configured correctly.</p>
				</div>
			`,
			priority: EmailPriority.CRITICAL,
			userId,
			tags: [{ name: 'kind', value: 'admin_test' }],
		});

		invalidateTags(CACHE_TAGS.EMAIL_CONFIG);
		return { success: true as const, data: { sentTo: to } };
	} catch (err) {
		console.error('Test email failed:', err);
		return {
			error: err instanceof Error ? err.message : 'Test email failed',
		};
	}
}

/**
 * Project the notification-type registry into the database on demand.
 *
 * The registry syncs automatically on the daily scheduler tick, but that leaves a
 * window after a deploy where a newly added notification type has no row and so
 * cannot appear in anyone's preferences. This is the manual escape hatch, with
 * none of the side effects of triggering the whole cron (which would also
 * generate reports and upload blobs).
 *
 * Idempotent, and it applies the same default-flip protection as the scheduled
 * run — an existing user never silently loses mail they were receiving.
 */
export async function adminSyncNotificationTypesAction(): Promise<
	ActionResponse<{ synced: number; preserved: number }>
> {
	const { error } = await requireAdminSession();
	if (error) return { error };

	try {
		const result = await NotificationService.syncTypes();
		invalidateTags(CACHE_TAGS.ADMIN);
		invalidateTags(CACHE_TAGS.PROFILE);
		return { success: true as const, data: result };
	} catch (err) {
		console.error('Notification type sync failed:', err);
		return {
			error:
				err instanceof Error ? err.message : 'Failed to sync notification types',
		};
	}
}
