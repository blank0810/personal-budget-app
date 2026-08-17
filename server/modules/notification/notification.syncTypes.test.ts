import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
	typeFindUnique: vi.fn(),
	typeCreate: vi.fn(),
	typeUpdate: vi.fn(),
	userFindMany: vi.fn(),
	prefCreateMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		notificationType: {
			findUnique: mocks.typeFindUnique,
			create: mocks.typeCreate,
			update: mocks.typeUpdate,
			findMany: vi.fn(),
			findUniqueOrThrow: vi.fn(),
		},
		userNotificationPreference: {
			createMany: mocks.prefCreateMany,
			upsert: vi.fn(),
		},
		user: { findMany: mocks.userFindMany },
	},
}));

vi.mock('@/server/modules/user/user.service', () => ({
	UserService: {
		getEmailNotificationsEnabled: vi.fn(),
		getCurrency: vi.fn(),
		getEmailAndName: vi.fn(),
		resolveNotificationRecipient: vi.fn(),
	},
}));

vi.mock('@/server/modules/email/email.service', () => ({
	EmailService: { send: vi.fn(), sendWithAttachment: vi.fn() },
}));

const { NotificationService } = await import('./notification.service');
const { NOTIFICATION_TYPES } = await import('./notification.registry');

describe('NotificationService.syncTypes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.userFindMany.mockResolvedValue([]);
		mocks.prefCreateMany.mockResolvedValue({ count: 0 });
	});

	it('creates a type that does not exist yet', async () => {
		mocks.typeFindUnique.mockResolvedValue(null);

		const result = await NotificationService.syncTypes();

		expect(result.synced).toBe(NOTIFICATION_TYPES.length);
		expect(mocks.typeCreate).toHaveBeenCalledTimes(NOTIFICATION_TYPES.length);
		expect(mocks.typeUpdate).not.toHaveBeenCalled();
	});

	it('projects registry metadata onto an existing row', async () => {
		mocks.typeFindUnique.mockResolvedValue({
			id: 'nt_1',
			defaultEnabled: true,
		});

		await NotificationService.syncTypes();

		const monthly = NOTIFICATION_TYPES.find(
			(t) => t.key === 'monthly_report'
		)!;
		expect(mocks.typeUpdate).toHaveBeenCalledWith({
			where: { key: 'monthly_report' },
			data: {
				label: monthly.label,
				description: monthly.description,
				category: monthly.category,
				defaultEnabled: monthly.defaultEnabled,
			},
		});
	});

	describe('protecting a default that flips true -> false', () => {
		beforeEach(() => {
			// Every type currently defaults to true in the DB. income_notifications
			// is false in the registry, so only that one should trigger a backfill.
			mocks.typeFindUnique.mockImplementation(
				async ({ where }: { where: { key: string } }) => ({
					id: `nt_${where.key}`,
					defaultEnabled: true,
				})
			);
			mocks.userFindMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
			mocks.prefCreateMany.mockResolvedValue({ count: 2 });
		});

		it('writes explicit opt-ins for users with no row, so behaviour is unchanged', async () => {
			const result = await NotificationService.syncTypes();

			expect(mocks.prefCreateMany).toHaveBeenCalledWith({
				data: [
					{
						userId: 'u1',
						notificationTypeId: 'nt_income_notifications',
						channel: 'EMAIL',
						enabled: true,
					},
					{
						userId: 'u2',
						notificationTypeId: 'nt_income_notifications',
						channel: 'EMAIL',
						enabled: true,
					},
				],
				skipDuplicates: true,
			});
			expect(result.preserved).toBe(2);
		});

		it('only targets users who lack an explicit EMAIL row', async () => {
			await NotificationService.syncTypes();

			expect(mocks.userFindMany).toHaveBeenCalledWith({
				where: {
					notificationPreferences: {
						none: {
							notificationTypeId: 'nt_income_notifications',
							channel: 'EMAIL',
						},
					},
				},
				select: { id: true },
			});
		});

		it('backfills for the flipping type only, not every type', async () => {
			await NotificationService.syncTypes();
			expect(mocks.prefCreateMany).toHaveBeenCalledTimes(1);
		});

		it('backfills before flipping the stored default', async () => {
			const order: string[] = [];
			mocks.prefCreateMany.mockImplementation(async () => {
				order.push('backfill');
				return { count: 2 };
			});
			mocks.typeUpdate.mockImplementation(async (args: {
				where: { key: string };
			}) => {
				order.push(`update:${args.where.key}`);
				return {};
			});

			await NotificationService.syncTypes();

			// If the flip landed first, a send in between would read false and drop
			// mail the user still expects.
			expect(order.indexOf('backfill')).toBeLessThan(
				order.indexOf('update:income_notifications')
			);
		});
	});

	it('does not backfill when the stored default already matches', async () => {
		mocks.typeFindUnique.mockImplementation(
			async ({ where }: { where: { key: string } }) => ({
				id: `nt_${where.key}`,
				defaultEnabled:
					NOTIFICATION_TYPES.find((t) => t.key === where.key)
						?.defaultEnabled ?? true,
			})
		);

		const result = await NotificationService.syncTypes();

		expect(mocks.prefCreateMany).not.toHaveBeenCalled();
		expect(result.preserved).toBe(0);
	});

	it('does not backfill when a default goes false -> true (nothing is lost)', async () => {
		mocks.typeFindUnique.mockResolvedValue({
			id: 'nt_1',
			defaultEnabled: false,
		});

		await NotificationService.syncTypes();

		expect(mocks.prefCreateMany).not.toHaveBeenCalled();
	});

	it('skips the backfill query result when no users need one', async () => {
		mocks.typeFindUnique.mockImplementation(
			async ({ where }: { where: { key: string } }) => ({
				id: `nt_${where.key}`,
				defaultEnabled: true,
			})
		);
		mocks.userFindMany.mockResolvedValue([]);

		const result = await NotificationService.syncTypes();

		expect(mocks.prefCreateMany).not.toHaveBeenCalled();
		expect(result.preserved).toBe(0);
	});
});

describe('notification registry', () => {
	it('has unique keys', () => {
		const keys = NOTIFICATION_TYPES.map((t) => t.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('keeps income_notifications default-off as the high-volume type', () => {
		const income = NOTIFICATION_TYPES.find(
			(t) => t.key === 'income_notifications'
		)!;
		expect(income.defaultEnabled).toBe(false);
	});

	it('keeps the low-volume digest and alerts default-on', () => {
		for (const key of ['monthly_report', 'budget_alerts']) {
			expect(
				NOTIFICATION_TYPES.find((t) => t.key === key)!.defaultEnabled
			).toBe(true);
		}
	});
});
