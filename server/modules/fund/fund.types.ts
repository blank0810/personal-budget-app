/**
 * Fund Types - Type definitions for Fund accounts and health metrics
 */

export const FundCalculationMode = {
	MONTHS_COVERAGE: 'MONTHS_COVERAGE',
	TARGET_PROGRESS: 'TARGET_PROGRESS',
} as const;

export type FundCalculationModeType =
	(typeof FundCalculationMode)[keyof typeof FundCalculationMode];

export type FundHealthStatus =
	| 'critical'
	| 'underfunded'
	| 'building'
	| 'funded';

export interface FundHealthMetric {
	id: string;
	name: string;
	type: 'EMERGENCY_FUND' | 'FUND';
	balance: number;
	targetAmount: number | null;
	calculationMode: string;
	progressPercent: number;
	monthsCoverage: number | null;
	healthStatus: FundHealthStatus;
	thresholds: {
		low: number;
		mid: number;
		high: number;
	};
}

export interface FundHealthSummary {
	funds: FundHealthMetric[];
	totalFundBalance: number;
	hasEmergencyFund: boolean;
	emergencyFundMonths: number | null;
	emergencyFundHealth: FundHealthStatus | null;
}

export interface FundHealthReportData {
	funds: FundHealthMetric[];
	summary: {
		totalFundBalance: number;
		fundCount: number;
		criticalCount: number;
		underfundedCount: number;
		buildingCount: number;
		fundedCount: number;
		hasEmergencyFund: boolean;
	};
}
