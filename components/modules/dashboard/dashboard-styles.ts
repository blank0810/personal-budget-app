import type { DashboardTone } from '@/server/modules/dashboard/dashboard.types';

export const DASHBOARD_TONE_STYLES: Record<
	DashboardTone,
	{ text: string; badge: string; marker: string }
> = {
	positive: {
		text: 'text-emerald-700 dark:text-emerald-300',
		badge:
			'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
		marker: 'bg-emerald-500',
	},
	warning: {
		text: 'text-amber-700 dark:text-amber-300',
		badge:
			'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
		marker: 'bg-amber-500',
	},
	negative: {
		text: 'text-red-700 dark:text-red-300',
		badge:
			'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
		marker: 'bg-red-500',
	},
	neutral: {
		text: 'text-muted-foreground',
		badge: 'bg-muted text-muted-foreground',
		marker: 'bg-muted-foreground',
	},
};
