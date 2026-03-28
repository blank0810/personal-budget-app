/**
 * Canonical tag names used across all controllers for targeted revalidation.
 * Each tag represents a logical data domain. When a mutation touches a domain
 * the corresponding tag(s) should be invalidated via `invalidateTags()`.
 */
export const CACHE_TAGS = {
	INCOMES: 'incomes',
	EXPENSES: 'expenses',
	ACCOUNTS: 'accounts',
	BUDGETS: 'budgets',
	TRANSFERS: 'transfers',
	PAYMENTS: 'payments',
	GOALS: 'goals',
	DASHBOARD: 'dashboard',
	RECURRING: 'recurring',
	CLIENTS: 'clients',
	WORK_ENTRIES: 'work-entries',
	INVOICES: 'invoices',
	CATEGORIES: 'categories',
	REPORTS: 'reports',
	PROFILE: 'profile',
	ADMIN: 'admin',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
