import { z } from 'zod';

export const AUTOMATION_FREQUENCIES = [
	'HOURLY',
	'DAILY',
	'WEEKLY',
	'MONTHLY',
] as const;

export const updateAutomationScheduleSchema = z
	.object({
		frequency: z.enum(AUTOMATION_FREQUENCIES),
		atMinute: z.number().int().min(0).max(59).nullable().optional(),
		atHour: z.number().int().min(0).max(23).nullable().optional(),
		dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
		dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
		enabled: z.boolean(),
	})
	.strict();

export const automationScheduleIdSchema = z
	.string()
	.min(1, 'Schedule id is required');

export type UpdateAutomationScheduleInput = z.infer<
	typeof updateAutomationScheduleSchema
>;

export type AutomationFrequencyValue =
	(typeof AUTOMATION_FREQUENCIES)[number];

export type AutomationScheduleDto = {
	id: string;
	jobKey: string;
	label: string;
	frequency: AutomationFrequencyValue;
	atMinute: number | null;
	atHour: number | null;
	dayOfWeek: number | null;
	dayOfMonth: number | null;
	enabled: boolean;
	lastRunAt: string | null;
	nextRunAt: string | null;
	lastStatus: string | null;
	createdAt: string;
	updatedAt: string;
};
