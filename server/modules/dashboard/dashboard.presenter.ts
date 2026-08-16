import { format } from 'date-fns';
import {
	HEALTH_PILLARS,
	getHealthLabelDescription,
	type HealthPillarName,
} from '@/lib/financial-health-copy';
import { formatCurrency } from '@/lib/formatters';
import type {
	DashboardAction,
	DashboardDataQuality,
	DashboardOverview,
	DashboardPillarRow,
	DashboardTone,
} from './dashboard.types';

interface DashboardSourceAccount {
	id: string;
	name: string;
	type: string;
	balance: number;
	isLiability: boolean;
	isArchived: boolean;
}

interface DashboardSourceSummary {
	accounts: DashboardSourceAccount[];
	netWorth: number;
	assets: number;
	liabilities: number;
	savingsRate: number;
	runwayMonths: number | null;
	creditUtilization: number;
	totalCreditUsed: number;
	totalCreditLimit: number;
	totalDebt: number;
	debtPaydown: number;
	debtToAssetRatio: number;
	liquidAssets: number;
	ytdIncome: number;
	ytdExpense: number;
	income: number;
	expense: number;
}

interface DashboardSourcePillar {
	name: string;
	score: number;
	grade: string;
	weight: number;
	details: string;
	recommendation: string;
}

interface DashboardSourceBudget {
	id: string;
	name: string;
	categoryId: string;
	categoryName: string;
	amount: number;
	spent: number;
	percentage: number;
}

type DashboardSourceTransaction =
	| {
			kind: 'income';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
	  }
	| {
			kind: 'expense';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			accountName: string | null;
			categoryName: string;
			budgetName: string | null;
	  }
	| {
			kind: 'transfer';
			id: string;
			amount: number;
			date: string;
			description: string | null;
			fromAccountName: string;
			toAccountName: string;
			fee: number;
			isPayment: boolean;
	  };

export interface DashboardOverviewSource {
	currency: string;
	dashboard: DashboardSourceSummary;
	health: {
		overallScore: number;
		overallLabel: string;
		pillars: DashboardSourcePillar[];
	};
	trend: Array<{ month: string; income: number; expense: number }>;
	budgets: DashboardSourceBudget[];
	incomeCategories: Array<{ id: string; name: string }>;
	expenseCategories: Array<{ id: string; name: string }>;
	transactions: DashboardSourceTransaction[];
}

const PILLAR_ACTIONS: Record<HealthPillarName, DashboardAction> = {
	Solvency: { kind: 'link', href: '/accounts', label: 'Review debt' },
	Liquidity: { kind: 'link', href: '/goals', label: 'Build your buffer' },
	Savings: { kind: 'link', href: '/budgets', label: 'Find room to save' },
	'Debt Management': {
		kind: 'quick-action',
		action: 'payment',
		label: 'Pay down debt',
	},
	'Cash Flow': {
		kind: 'link',
		href: '/transactions',
		label: 'Review cash flow',
	},
};

function classifyDataQuality(
	dashboard: DashboardSourceSummary
): DashboardDataQuality {
	const hasAccount = dashboard.accounts.some(
		(account) => account.type !== 'TITHE'
	);
	const hasFlow = dashboard.ytdIncome > 0 || dashboard.ytdExpense > 0;
	if (!hasAccount && !hasFlow) return 'empty';
	if (hasAccount && !hasFlow) return 'partial';
	if (hasAccount && hasFlow) return 'complete';
	return 'partial';
}

function toneForScore(score: number | null): DashboardTone {
	if (score === null) return 'neutral';
	if (score >= 75) return 'positive';
	if (score >= 60) return 'warning';
	return 'negative';
}

function evidenceFor(
	name: HealthPillarName,
	source: DashboardOverviewSource,
	quality: DashboardDataQuality
): string {
	const data = source.dashboard;
	if (quality === 'empty') return 'Account and transaction history required';
	if (
		quality === 'partial' &&
		(name === 'Savings' || name === 'Cash Flow')
	) {
		return 'Income and expense history required';
	}
	if (name === 'Solvency') {
		return data.totalDebt <= 0
			? 'Debt-free'
			: `${Math.max(0, data.debtToAssetRatio).toFixed(1)}% debt-to-asset`;
	}
	if (name === 'Liquidity') {
		return data.runwayMonths === null
			? 'Runway needs expense data'
			: `${data.runwayMonths.toFixed(1)} months of runway`;
	}
	if (name === 'Savings') {
		return `${data.savingsRate.toFixed(1)}% YTD savings rate`;
	}
	if (name === 'Debt Management') {
		if (data.totalDebt <= 0) return 'Debt-free';
		if (data.totalCreditLimit > 0) {
			return `${Math.max(0, data.creditUtilization).toFixed(1)}% credit utilization`;
		}
		return `${formatCurrency(data.totalDebt, {
			currency: source.currency,
			decimals: 0,
		})} total debt`;
	}
	return `${formatCurrency(data.income, {
		currency: source.currency,
		decimals: 0,
	})} in · ${formatCurrency(data.expense, {
		currency: source.currency,
		decimals: 0,
	})} out`;
}

function buildPillars(
	source: DashboardOverviewSource,
	quality: DashboardDataQuality
): DashboardPillarRow[] {
	const byName = new Map(
		source.health.pillars.map((pillar) => [pillar.name, pillar])
	);

	return HEALTH_PILLARS.map((definition) => {
		const raw = byName.get(definition.name);
		if (!raw) {
			throw new Error(`Missing health pillar: ${definition.name}`);
		}
		const supported =
			quality === 'complete' ||
			(quality === 'partial' &&
				definition.name !== 'Savings' &&
				definition.name !== 'Cash Flow');
		const action =
			quality === 'partial' && definition.name === 'Savings'
				? ({
						kind: 'quick-action',
						action: 'income',
						label: 'Add income',
					} satisfies DashboardAction)
				: quality === 'partial' && definition.name === 'Cash Flow'
					? ({
							kind: 'quick-action',
							action: 'expense',
							label: 'Add expense',
						} satisfies DashboardAction)
					: definition.name === 'Debt Management' &&
						  source.dashboard.totalDebt <= 0
						? ({
								kind: 'link',
								href: '/accounts',
								label: 'Review accounts',
							} satisfies DashboardAction)
						: PILLAR_ACTIONS[definition.name];
		return {
			name: definition.name,
			question: definition.question,
			weight: definition.weight,
			score: supported ? raw.score : null,
			grade: supported ? raw.grade : null,
			status: supported ? 'supported' : 'needs-data',
			tone: toneForScore(supported ? raw.score : null),
			evidence: evidenceFor(definition.name, source, quality),
			recommendation: supported ? raw.recommendation : null,
			action,
		};
	});
}

function chooseFocus(pillars: DashboardPillarRow[]): DashboardPillarRow | null {
	const order = new Map(
		HEALTH_PILLARS.map((pillar, index) => [pillar.name, index])
	);
	return (
		[...pillars]
			.filter(
				(pillar) =>
					pillar.status === 'supported' &&
					pillar.grade !== 'A' &&
					pillar.score !== null
			)
			.sort(
				(a, b) =>
					(a.score as number) - (b.score as number) ||
					b.weight - a.weight ||
					(order.get(a.name) as number) - (order.get(b.name) as number)
			)[0] ?? null
	);
}

function mapActivity(
	transaction: DashboardSourceTransaction
): DashboardOverview['recentActivity'][number] {
	if (transaction.kind === 'income') {
		return {
			id: transaction.id,
			kind: 'income',
			title: transaction.description?.trim() || transaction.categoryName,
			context: [transaction.categoryName, transaction.accountName]
				.filter(Boolean)
				.join(' · '),
			amount: transaction.amount,
			direction: 'in',
			date: transaction.date,
		};
	}
	if (transaction.kind === 'expense') {
		return {
			id: transaction.id,
			kind: 'expense',
			title: transaction.description?.trim() || transaction.categoryName,
			context: [transaction.categoryName, transaction.accountName]
				.filter(Boolean)
				.join(' · '),
			amount: transaction.amount,
			direction: 'out',
			date: transaction.date,
		};
	}
	const kind = transaction.isPayment ? 'payment' : 'transfer';
	return {
		id: transaction.id,
		kind,
		title:
			transaction.description?.trim() ||
			(transaction.isPayment ? 'Debt payment' : 'Transfer'),
		context: `${transaction.fromAccountName} → ${transaction.toAccountName}`,
		amount: transaction.amount,
		direction: 'neutral',
		date: transaction.date,
	};
}

export function buildDashboardOverview(
	source: DashboardOverviewSource,
	now: Date
): DashboardOverview {
	const dataQuality = classifyDataQuality(source.dashboard);
	const pillars = buildPillars(source, dataQuality);
	const focusPillar = chooseFocus(pillars);
	const activeAccounts = source.dashboard.accounts.filter(
		(account) => !account.isArchived && account.type !== 'TITHE'
	);
	const assetAccounts = activeAccounts.filter(
		(account) => !account.isLiability
	);
	const liabilityAccounts = activeAccounts.filter(
		(account) => account.isLiability
	);
	const hasAccount = activeAccounts.length > 0;
	const hasTransferPair = activeAccounts.length > 1;
	const hasPaymentPair =
		assetAccounts.length > 0 && liabilityAccounts.length > 0;
	const totalBudgeted = source.budgets.reduce(
		(sum, budget) => sum + budget.amount,
		0
	);
	const totalSpent = source.budgets.reduce(
		(sum, budget) => sum + budget.spent,
		0
	);
	const points = source.trend.map((point) => ({
		month: point.month,
		income: point.income,
		expense: point.expense,
		surplus: point.income - point.expense,
	}));
	const totalIncome = points.reduce((sum, point) => sum + point.income, 0);
	const totalExpense = points.reduce((sum, point) => sum + point.expense, 0);

	return {
		snapshotLabel: format(now, 'MMMM yyyy'),
		currency: source.currency,
		dataQuality,
		quickActions: {
			accounts: activeAccounts.map((account) => ({
				id: account.id,
				name: account.name,
				type: account.type,
				balance: account.balance,
				isLiability: account.isLiability,
			})),
			incomeCategories: source.incomeCategories.map((category) => ({
				id: category.id,
				name: category.name,
			})),
			expenseCategories: source.expenseCategories.map((category) => ({
				id: category.id,
				name: category.name,
			})),
			budgets: source.budgets.map((budget) => ({
				id: budget.id,
				name: budget.name,
				categoryId: budget.categoryId,
				categoryName: budget.categoryName,
			})),
			availability: {
				income: {
					enabled: hasAccount,
					disabledReason: hasAccount ? null : 'Add an account first',
				},
				expense: {
					enabled: hasAccount,
					disabledReason: hasAccount ? null : 'Add an account first',
				},
				transfer: {
					enabled: hasTransferPair,
					disabledReason: hasTransferPair
						? null
						: 'Add at least two accounts first',
				},
				payment: {
					enabled: hasPaymentPair,
					disabledReason: hasPaymentPair
						? null
						: 'Add an asset and a liability account first',
				},
			},
		},
		health: {
			verdict:
				dataQuality === 'complete'
					? {
							score: source.health.overallScore,
							label: source.health.overallLabel,
							description: getHealthLabelDescription(
								source.health.overallLabel
							),
							tone: toneForScore(source.health.overallScore),
							focus: focusPillar
								? {
										pillarName: focusPillar.name,
										grade: focusPillar.grade,
										recommendation:
											focusPillar.recommendation as string,
										action: focusPillar.action,
									}
								: {
										pillarName: null,
										grade: null,
										recommendation: 'All five pillars are graded A.',
										action: {
											kind: 'link',
											href: '/reports',
											label: 'Open full report',
										},
									},
						}
					: null,
			pillars,
		},
		evidence: {
			netWorth: source.dashboard.netWorth,
			income: source.dashboard.income,
			expense: source.dashboard.expense,
			surplus: source.dashboard.income - source.dashboard.expense,
		},
		cashFlow: {
			points,
			hasActivity: totalIncome > 0 || totalExpense > 0,
			totalIncome,
			totalExpense,
			net: totalIncome - totalExpense,
		},
		budgetPressure: {
			hasBudgets: source.budgets.length > 0,
			totalBudgeted,
			totalSpent,
			utilizationPercent:
				totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : null,
			items: [...source.budgets]
				.sort((a, b) => b.percentage - a.percentage)
				.slice(0, 3)
				.map((budget) => ({
					id: budget.id,
					name: budget.name,
					categoryName: budget.categoryName,
					amount: budget.amount,
					spent: budget.spent,
					percentage: budget.percentage,
				})),
		},
		accountsDebt: {
			liquidAssets: source.dashboard.liquidAssets,
			liabilities: Math.max(0, source.dashboard.liabilities),
			netWorth: source.dashboard.netWorth,
			creditUtilization:
				source.dashboard.totalCreditLimit > 0
					? Math.max(0, source.dashboard.creditUtilization)
					: null,
		},
		recentActivity: source.transactions.slice(0, 8).map(mapActivity),
	};
}
