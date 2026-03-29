import { z } from 'zod';

// All known feature flag keys -- single source of truth
export const FEATURE_KEYS = {
	RECURRING_TRANSACTIONS: 'recurring_transactions',
	CSV_IMPORT: 'csv_import',
	GOALS: 'goals',
	INVOICES: 'invoices',
	AI_FEATURES: 'ai_features',
	BULK_PDF_EXPORT: 'bulk_pdf_export',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

// Allowed flag key values for Zod validation
const featureKeyValues = Object.values(FEATURE_KEYS) as [string, ...string[]];

// --- Zod schemas for mutation actions ---

export const setUserFeatureSchema = z.object({
	userId: z.string().min(1, 'userId is required'),
	flagKey: z.enum(featureKeyValues, {
		error: 'Unknown feature key',
	}),
	enabled: z.boolean(),
});

export const resetUserFeatureSchema = z.object({
	userId: z.string().min(1, 'userId is required'),
	flagKey: z.enum(featureKeyValues, {
		error: 'Unknown feature key',
	}),
});

export const getUserFeaturesSchema = z.object({
	userId: z.string().min(1, 'userId is required'),
});

export const updateSystemSettingSchema = z.object({
	key: z.string().min(1, 'key is required'),
	value: z.string(),
});

// Maps feature keys to the sidebar items and routes they gate
export const FEATURE_ROUTE_MAP: Record<
	string,
	{ routes: string[]; sidebarKeys: string[] }
> = {
	[FEATURE_KEYS.RECURRING_TRANSACTIONS]: {
		routes: ['/recurring'],
		sidebarKeys: ['Recurring'],
	},
	[FEATURE_KEYS.CSV_IMPORT]: {
		routes: ['/import'],
		sidebarKeys: ['Import'],
	},
	[FEATURE_KEYS.GOALS]: {
		routes: ['/goals'],
		sidebarKeys: ['Goals'],
	},
	[FEATURE_KEYS.INVOICES]: {
		routes: ['/clients', '/entries', '/invoices'],
		sidebarKeys: ['Invoices'], // Parent nav item -- hides entire group
	},
	[FEATURE_KEYS.AI_FEATURES]: {
		routes: [], // No routes yet
		sidebarKeys: [], // No sidebar yet
	},
	[FEATURE_KEYS.BULK_PDF_EXPORT]: {
		routes: [], // Not a route -- gated at the UI component level
		sidebarKeys: [], // No sidebar item
	},
};

export type ResolvedFeatures = Record<string, boolean>;
