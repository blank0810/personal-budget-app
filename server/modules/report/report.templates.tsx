import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Font,
	renderToBuffer,
} from '@react-pdf/renderer';
import { MonthlyDigest } from './report.types';
import path from 'path';

// Register fonts from local files (no external URL dependency)
const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
	family: 'DM Serif Display',
	src: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
});

Font.register({
	family: 'DM Sans',
	fonts: [
		{
			src: path.join(fontsDir, 'DMSans-Regular.ttf'),
			fontWeight: 400,
		},
		{
			src: path.join(fontsDir, 'DMSans-Medium.ttf'),
			fontWeight: 500,
		},
		{
			src: path.join(fontsDir, 'DMSans-Bold.ttf'),
			fontWeight: 700,
		},
	],
});

// Colors
const TEAL = '#0D9488';
const TEAL_LIGHT = '#CCFBF1';
const GREEN = '#059669';
const RED = '#DC2626';
const GRAY_50 = '#F9FAFB';
const GRAY_100 = '#F3F4F6';
const GRAY_300 = '#D1D5DB';
const GRAY_500 = '#6B7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';

const styles = StyleSheet.create({
	page: {
		fontFamily: 'DM Sans',
		fontSize: 10,
		color: GRAY_900,
		paddingTop: 48,
		paddingBottom: 72,
		paddingHorizontal: 48,
		backgroundColor: '#FFFFFF',
	},
	// Header
	header: {
		marginBottom: 32,
		borderBottomWidth: 2,
		borderBottomColor: TEAL,
		paddingBottom: 16,
	},
	headerTitle: {
		fontFamily: 'DM Serif Display',
		fontSize: 22,
		color: TEAL,
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: 11,
		color: GRAY_500,
	},
	// Section
	section: {
		marginBottom: 28,
	},
	sectionTitle: {
		fontFamily: 'DM Serif Display',
		fontSize: 15,
		color: TEAL,
		marginBottom: 12,
		paddingBottom: 6,
		borderBottomWidth: 1,
		borderBottomColor: GRAY_100,
	},
	// Health Score
	scoreRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	scoreCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		borderWidth: 4,
		borderColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	scoreNumber: {
		fontFamily: 'DM Serif Display',
		fontSize: 22,
		color: TEAL,
	},
	scoreLabel: {
		fontSize: 13,
		fontWeight: 700,
		color: GRAY_900,
		marginBottom: 2,
	},
	scoreSublabel: {
		fontSize: 10,
		color: GRAY_500,
	},
	roastBox: {
		backgroundColor: GRAY_50,
		padding: 12,
		borderLeftWidth: 3,
		borderLeftColor: TEAL,
		marginBottom: 8,
	},
	roastText: {
		fontSize: 9,
		color: GRAY_700,
		lineHeight: 1.5,
	},
	focusRow: {
		flexDirection: 'row',
		marginTop: 6,
	},
	focusBadge: {
		backgroundColor: TEAL_LIGHT,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
		marginRight: 8,
	},
	focusBadgeText: {
		fontSize: 8,
		fontWeight: 700,
		color: TEAL,
	},
	recommendationText: {
		fontSize: 9,
		color: GRAY_500,
		flex: 1,
		lineHeight: 1.4,
	},
	// Narrative text
	narrative: {
		fontSize: 11,
		color: GRAY_700,
		lineHeight: 1.6,
		marginBottom: 4,
	},
	narrativeBold: {
		fontWeight: 700,
	},
	// Progress bar
	progressBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	progressLabel: {
		width: 100,
		fontSize: 9,
		color: GRAY_700,
	},
	progressBarTrack: {
		flex: 1,
		height: 8,
		backgroundColor: GRAY_100,
		borderRadius: 4,
		marginHorizontal: 8,
	},
	progressBarFill: {
		height: 8,
		borderRadius: 4,
		backgroundColor: TEAL,
	},
	progressAmount: {
		width: 70,
		fontSize: 9,
		color: GRAY_900,
		fontWeight: 500,
		textAlign: 'right',
	},
	// Table rows
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: GRAY_100,
	},
	tableLabel: {
		flex: 1,
		fontSize: 9,
		color: GRAY_700,
	},
	tableValue: {
		fontSize: 9,
		fontWeight: 700,
		color: GRAY_900,
		textAlign: 'right',
	},
	// Net Worth
	netWorthValue: {
		fontFamily: 'DM Serif Display',
		fontSize: 28,
		color: GRAY_900,
		marginBottom: 4,
	},
	netWorthChange: {
		fontSize: 12,
		fontWeight: 500,
	},
	// Footer
	footer: {
		position: 'absolute',
		bottom: 24,
		left: 48,
		right: 48,
		borderTopWidth: 1,
		borderTopColor: GRAY_300,
		paddingTop: 8,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	footerText: {
		fontSize: 7,
		color: GRAY_500,
	},
	footerDisclaimer: {
		fontSize: 7,
		color: GRAY_500,
		marginTop: 4,
	},
});

function formatCurrency(val: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(val);
}

function formatPercent(val: number): string {
	return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

// --- Section Components ---

function HeaderSection({ digest }: { digest: MonthlyDigest }) {
	return (
		<View style={styles.header}>
			<Text style={styles.headerTitle}>
				Budget Planner | Monthly Financial Report
			</Text>
			<Text style={styles.headerSubtitle}>
				{digest.month} | Prepared for {digest.userName}
			</Text>
		</View>
	);
}

function HealthScoreSection({
	data,
}: {
	data: MonthlyDigest['sections']['healthScore'];
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Financial Health Score</Text>
			<View style={styles.scoreRow}>
				<View style={styles.scoreCircle}>
					<Text style={styles.scoreNumber}>{data.score}</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.scoreLabel}>{data.label}</Text>
					<Text style={styles.scoreSublabel}>out of 100</Text>
				</View>
			</View>
			<View style={styles.roastBox}>
				<Text style={styles.roastText}>{data.roast}</Text>
			</View>
			<View style={styles.focusRow}>
				<View style={styles.focusBadge}>
					<Text style={styles.focusBadgeText}>
						Focus: {data.focusPillar}
					</Text>
				</View>
				<Text style={styles.recommendationText}>
					{data.topRecommendation}
				</Text>
			</View>
		</View>
	);
}

function IncomeExpenseSection({
	data,
}: {
	data: NonNullable<MonthlyDigest['sections']['incomeExpense']>;
}) {
	const saved = data.netResult >= 0;
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Your Month at a Glance</Text>
			<Text style={styles.narrative}>
				You earned{' '}
				<Text style={styles.narrativeBold}>
					{formatCurrency(data.totalIncome)}
				</Text>{' '}
				and spent{' '}
				<Text style={styles.narrativeBold}>
					{formatCurrency(data.totalExpense)}
				</Text>
				.
			</Text>
			<Text style={styles.narrative}>
				{saved ? (
					<>
						You saved{' '}
						<Text style={{ ...styles.narrativeBold, color: GREEN }}>
							{formatCurrency(data.netResult)}
						</Text>{' '}
						— that&apos;s {data.savingsRate.toFixed(1)}% of your
						income.
					</>
				) : (
					<>
						You overspent by{' '}
						<Text style={{ ...styles.narrativeBold, color: RED }}>
							{formatCurrency(Math.abs(data.netResult))}
						</Text>
						.
					</>
				)}
			</Text>
		</View>
	);
}

function TopCategoriesSection({
	data,
}: {
	data: NonNullable<MonthlyDigest['sections']['topCategories']>;
}) {
	const maxAmount = data[0]?.amount || 1;

	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Where Your Money Went</Text>
			{data.map((cat) => (
				<View key={cat.name} style={styles.progressBarContainer}>
					<Text style={styles.progressLabel}>{cat.name}</Text>
					<View style={styles.progressBarTrack}>
						<View
							style={{
								...styles.progressBarFill,
								width: `${Math.min(100, (cat.amount / maxAmount) * 100)}%`,
							}}
						/>
					</View>
					<Text style={styles.progressAmount}>
						{formatCurrency(cat.amount)}
					</Text>
				</View>
			))}
		</View>
	);
}

function BudgetCheckSection({
	data,
}: {
	data: NonNullable<MonthlyDigest['sections']['budgetPerformance']>;
}) {
	const under = data.overUnder >= 0;
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Budget Check</Text>
			<Text style={styles.narrative}>
				You budgeted{' '}
				<Text style={styles.narrativeBold}>
					{formatCurrency(data.totalBudgeted)}
				</Text>{' '}
				and spent{' '}
				<Text style={styles.narrativeBold}>
					{formatCurrency(data.totalSpent)}
				</Text>
				.
			</Text>
			<Text style={styles.narrative}>
				{under ? (
					<>
						Under budget by{' '}
						<Text style={{ ...styles.narrativeBold, color: GREEN }}>
							{formatCurrency(data.overUnder)}
						</Text>
						. Nice restraint.
					</>
				) : (
					<>
						Over budget by{' '}
						<Text style={{ ...styles.narrativeBold, color: RED }}>
							{formatCurrency(Math.abs(data.overUnder))}
						</Text>
						. Time to recalibrate.
					</>
				)}
			</Text>
		</View>
	);
}

function LiabilitiesSection({
	data,
}: {
	data: NonNullable<MonthlyDigest['sections']['liabilities']>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Your Debt</Text>
			{data.accounts.map((acc) => (
				<View key={acc.name} style={styles.progressBarContainer}>
					<Text style={styles.progressLabel}>{acc.name}</Text>
					<View style={styles.progressBarTrack}>
						<View
							style={{
								...styles.progressBarFill,
								width: `${Math.min(100, acc.utilization || 0)}%`,
								backgroundColor:
									(acc.utilization || 0) > 70 ? RED : TEAL,
							}}
						/>
					</View>
					<Text style={styles.progressAmount}>
						{formatCurrency(acc.balance)}
					</Text>
				</View>
			))}
			<View style={styles.tableRow}>
				<Text style={styles.tableLabel}>Total Debt</Text>
				<Text style={{ ...styles.tableValue, color: RED }}>
					{formatCurrency(data.totalDebt)}
				</Text>
			</View>
			{data.monthlyPaydown > 0 && (
				<View style={styles.tableRow}>
					<Text style={styles.tableLabel}>Paid Down This Month</Text>
					<Text style={{ ...styles.tableValue, color: GREEN }}>
						{formatCurrency(data.monthlyPaydown)}
					</Text>
				</View>
			)}
		</View>
	);
}

function FundsSection({
	data,
}: {
	data: NonNullable<MonthlyDigest['sections']['funds']>;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Your Funds</Text>
			{data.accounts.map((fund) => (
				<View key={fund.name} style={styles.progressBarContainer}>
					<Text style={styles.progressLabel}>{fund.name}</Text>
					<View style={styles.progressBarTrack}>
						<View
							style={{
								...styles.progressBarFill,
								width: `${Math.min(100, fund.progress || 0)}%`,
								backgroundColor: GREEN,
							}}
						/>
					</View>
					<Text style={styles.progressAmount}>
						{formatCurrency(fund.balance)}
						{fund.target
							? ` / ${formatCurrency(fund.target)}`
							: ''}
					</Text>
				</View>
			))}
			{data.emergencyFundMonths != null && (
				<View style={styles.tableRow}>
					<Text style={styles.tableLabel}>
						Emergency Fund Coverage
					</Text>
					<Text style={styles.tableValue}>
						{data.emergencyFundMonths.toFixed(1)} months
					</Text>
				</View>
			)}
		</View>
	);
}

function NetWorthSection({
	data,
}: {
	data: MonthlyDigest['sections']['netWorth'];
}) {
	const positive = data.change >= 0;
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>Net Worth</Text>
			<Text style={styles.netWorthValue}>
				{formatCurrency(data.current)}
			</Text>
			{data.previousMonth !== 0 && (
				<Text
					style={{
						...styles.netWorthChange,
						color: positive ? GREEN : RED,
					}}
				>
					{positive ? '\u2191' : '\u2193'}{' '}
					{formatCurrency(Math.abs(data.change))} (
					{formatPercent(data.changePercent)}) from last month
				</Text>
			)}
		</View>
	);
}

function FooterSection({ digest }: { digest: MonthlyDigest }) {
	const generatedDate = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

	return (
		<View style={styles.footer} fixed>
			<View style={styles.footerRow}>
				<Text style={styles.footerText}>
					Budget Planner | {digest.month}
				</Text>
				<Text
					style={styles.footerText}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
				/>
			</View>
			<Text style={styles.footerDisclaimer}>
				Generated on {generatedDate}. Data reflects transactions recorded
				as of the last day of {digest.month}. For up-to-date figures,
				visit {appUrl}.
			</Text>
		</View>
	);
}

// --- Main Document ---

function MonthlyReportDocument({ digest }: { digest: MonthlyDigest }) {
	const { sections } = digest;

	return (
		<Document
			title={`Budget Planner - ${digest.month} Financial Report`}
			author="Budget Planner"
		>
			<Page size="A4" style={styles.page}>
				<HeaderSection digest={digest} />
				<HealthScoreSection data={sections.healthScore} />
				{sections.incomeExpense && (
					<IncomeExpenseSection data={sections.incomeExpense} />
				)}
				{sections.topCategories && (
					<TopCategoriesSection data={sections.topCategories} />
				)}
				{sections.budgetPerformance && (
					<BudgetCheckSection data={sections.budgetPerformance} />
				)}
				{sections.liabilities && (
					<LiabilitiesSection data={sections.liabilities} />
				)}
				{sections.funds && <FundsSection data={sections.funds} />}
				<NetWorthSection data={sections.netWorth} />
				<FooterSection digest={digest} />
			</Page>
		</Document>
	);
}

/**
 * Render the monthly report PDF to a buffer
 */
export async function renderMonthlyReportPDF(
	digest: MonthlyDigest
): Promise<Buffer> {
	const buffer = await renderToBuffer(
		<MonthlyReportDocument digest={digest} />
	);
	return Buffer.from(buffer);
}
