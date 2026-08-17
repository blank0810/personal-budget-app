/**
 * Notification types — the single source of truth.
 *
 * These used to be seeded rows in prisma/seed.ts, which meant adding a type
 * required a seed run and the pref key a service checked could silently drift
 * from any row that existed. Now the code is authoritative and the DB rows are a
 * projection of it, synced by `NotificationService.syncTypes()`. Mirrors the
 * pattern `server/modules/automation/registry.ts` already uses for cron jobs.
 *
 * The rows still exist because `UserNotificationPreference` needs a foreign key
 * to point at.
 */

export type NotificationCategory = 'reports' | 'alerts' | 'activity' | 'security';

export type NotificationTypeDefinition = {
	key: string;
	label: string;
	description: string;
	category: NotificationCategory;
	/**
	 * Applied when a user has no explicit preference row. Users inherit this
	 * live, so changing it changes behaviour for everyone who never touched the
	 * toggle — see the migration that backfills explicit rows before a flip.
	 */
	defaultEnabled: boolean;
	/**
	 * Rough sends per month for an active user. Recorded because the default
	 * above is a volume decision as much as a UX one: the Resend free tier allows
	 * 3,000/month, so defaulting a 20-a-month type to on costs ~10x what a
	 * monthly digest costs.
	 */
	monthlyVolume: string;
};

export const NOTIFICATION_TYPES: readonly NotificationTypeDefinition[] = [
	{
		key: 'monthly_report',
		label: 'Monthly Financial Report',
		description: 'Receive a PDF financial digest on the 1st of each month',
		category: 'reports',
		defaultEnabled: true,
		monthlyVolume: '1',
	},
	{
		key: 'budget_alerts',
		label: 'Budget Alerts',
		description: 'Get notified when a budget reaches 80% or exceeds 100%',
		category: 'alerts',
		defaultEnabled: true,
		monthlyVolume: '2-10 (at most 2 per budget)',
	},
	{
		key: 'income_notifications',
		label: 'Income Notifications',
		description: 'Get notified when income is recorded to your account',
		category: 'activity',
		// Default-OFF, changed from on. It is the highest-volume type by an order
		// of magnitude — one email per income record — and the least useful, since
		// the user just entered the record themselves. Existing users keep their
		// current behaviour via an explicit backfill in the migration that flips
		// this; only new accounts get the quiet default.
		defaultEnabled: false,
		monthlyVolume: '10-30 (one per income record)',
	},
];

export const NOTIFICATION_KEYS = NOTIFICATION_TYPES.map((t) => t.key);

export type NotificationKey = (typeof NOTIFICATION_TYPES)[number]['key'];

export function isNotificationKey(key: string): boolean {
	return NOTIFICATION_KEYS.includes(key);
}

export function getNotificationType(
	key: string
): NotificationTypeDefinition | undefined {
	return NOTIFICATION_TYPES.find((t) => t.key === key);
}

/** Display order for the grouped preference UI. */
export const CATEGORY_ORDER: readonly NotificationCategory[] = [
	'security',
	'reports',
	'alerts',
	'activity',
];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
	security: 'Security',
	reports: 'Reports',
	alerts: 'Alerts',
	activity: 'Activity',
};
