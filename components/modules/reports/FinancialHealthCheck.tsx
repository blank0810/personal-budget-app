'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
	Shield,
	Droplets,
	PiggyBank,
	CreditCard,
	ArrowLeftRight,
	ChevronDown,
	Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────

interface Pillar {
	name: string;
	score: number;
	grade: string;
	weight: number;
	details: string;
	recommendation: string;
}

interface FinancialHealthScoreData {
	overallScore: number;
	overallLabel: string;
	pillars: Pillar[];
}

interface FinancialHealthCheckProps {
	data: FinancialHealthScoreData;
	variant?: 'full' | 'score-only' | 'pillars-only' | 'badge';
}

// ─── Constants ──────────────────────────────────────

const PILLAR_ICONS: Record<string, typeof Shield> = {
	Solvency: Shield,
	Liquidity: Droplets,
	Savings: PiggyBank,
	'Debt Management': CreditCard,
	'Cash Flow': ArrowLeftRight,
};

const PILLAR_ONE_LINERS: Record<string, string> = {
	Solvency: 'Can you cover what you owe?',
	Liquidity: 'Can you survive an emergency?',
	Savings: 'Are you keeping enough of what you earn?',
	'Debt Management': 'Is your debt under control?',
	'Cash Flow': 'Is more coming in than going out?',
};

// ─── Color Utilities ────────────────────────────────

function getScoreColor(score: number) {
	if (score >= 90) return { text: 'text-emerald-600 dark:text-emerald-400', ring: 'stroke-emerald-500', glow: 'rgba(16,185,129,0.12)' };
	if (score >= 75) return { text: 'text-green-600 dark:text-green-400', ring: 'stroke-green-500', glow: 'rgba(34,197,94,0.12)' };
	if (score >= 60) return { text: 'text-yellow-600 dark:text-yellow-400', ring: 'stroke-yellow-500', glow: 'rgba(234,179,8,0.12)' };
	if (score >= 40) return { text: 'text-orange-600 dark:text-orange-400', ring: 'stroke-orange-500', glow: 'rgba(249,115,22,0.12)' };
	return { text: 'text-red-600 dark:text-red-400', ring: 'stroke-red-500', glow: 'rgba(239,68,68,0.12)' };
}

function getGradeColor(grade: string) {
	switch (grade) {
		case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
		case 'B': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
		case 'C': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
		case 'D': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
		default: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
	}
}

function getProgressColor(score: number) {
	if (score >= 90) return 'bg-emerald-500';
	if (score >= 75) return 'bg-green-500';
	if (score >= 60) return 'bg-yellow-500';
	if (score >= 40) return 'bg-orange-500';
	return 'bg-red-500';
}

function getLabelDescription(label: string) {
	switch (label) {
		case 'Excellent': return 'Absolutely elite. Your finances are tighter than a NASA launch checklist. Banks wish they had your discipline.';
		case 'Good': return 'You\'re doing well — genuinely. Most people would kill for this position. A couple of tweaks and you\'re untouchable.';
		case 'Fair': return 'Not terrible, not great. You\'re the financial equivalent of a C+ student — passing, but nobody\'s putting you on the fridge.';
		case 'Needs Attention': return 'Your finances are held together with duct tape and denial. This isn\'t a warning, it\'s an intervention.';
		case 'Critical': return 'Financially deceased. If your bank account was a patient, we\'d be calling time of death. Fix this or start a GoFundMe.';
		default: return '';
	}
}

// ─── Score Ring ─────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
	const [mounted, setMounted] = useState(false);
	const colors = getScoreColor(score);
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progress = (score / 100) * circumference;

	useEffect(() => {
		// Trigger animation after mount
		const id = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(id);
	}, []);

	return (
		<div
			className='relative shrink-0'
			style={{
				width: size,
				height: size,
				filter: `drop-shadow(0 0 16px ${colors.glow})`,
			}}
		>
			<svg width={size} height={size} className='-rotate-90'>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill='none'
					stroke='currentColor'
					className='text-muted/20'
					strokeWidth={strokeWidth}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill='none'
					className={colors.ring}
					strokeWidth={strokeWidth}
					strokeLinecap='round'
					strokeDasharray={circumference}
					strokeDashoffset={mounted ? circumference - progress : circumference}
					style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
				/>
			</svg>
			<div className='absolute inset-0 flex flex-col items-center justify-center'>
				<span className={cn(
					size <= 80 ? 'text-xl' : 'text-3xl',
					'font-bold tracking-tight',
					colors.text
				)}>{score}</span>
				<span className={cn(
					size <= 80 ? 'text-[10px]' : 'text-xs',
					'text-muted-foreground font-medium'
				)}>/100</span>
			</div>
		</div>
	);
}

// ─── Score-Only Card (for Overview hero row) ────────

function ScoreOnlyCard({ data }: { data: FinancialHealthScoreData }) {
	const colors = getScoreColor(data.overallScore);

	return (
		<Card className='h-full flex flex-col justify-center'>
			<CardContent className='flex flex-col items-center gap-3 pt-6'>
				<ScoreRing score={data.overallScore} />
				<div className='text-center'>
					<p className={cn('text-lg font-bold', colors.text)}>
						{data.overallLabel}
					</p>
					<p className='text-xs text-muted-foreground mt-1 max-w-[200px]'>
						{getLabelDescription(data.overallLabel)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Health Badge (compact inline for Overview row) ─

function HealthBadge({ data }: { data: FinancialHealthScoreData }) {
	const colors = getScoreColor(data.overallScore);

	return (
		<Card className='h-full'>
			<CardContent className='flex items-center gap-4 p-4 h-full'>
				<ScoreRing score={data.overallScore} size={80} />
				<div className='min-w-0'>
					<p className={cn('text-lg font-bold leading-tight', colors.text)}>
						{data.overallLabel}
					</p>
					<p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
						{getLabelDescription(data.overallLabel)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Pillars-Only Card (for Overview breakdown row) ─

function PillarsOnlyCard({ data }: { data: FinancialHealthScoreData }) {
	const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const id = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(id);
	}, []);

	const topRecommendation = [...data.pillars]
		.filter((p) => p.grade !== 'A')
		.sort((a, b) => a.score - b.score)[0];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Financial Health Breakdown</CardTitle>
			</CardHeader>
			<CardContent className='space-y-2'>
				{data.pillars.map((pillar, index) => {
					const Icon = PILLAR_ICONS[pillar.name] || Shield;
					const isExpanded = expandedPillar === pillar.name;
					const isWeakest = topRecommendation?.name === pillar.name;
					const oneLiner = PILLAR_ONE_LINERS[pillar.name];

					return (
						<div
							key={pillar.name}
							className={cn(
								'rounded-lg border transition-all',
								isWeakest && 'border-yellow-300 dark:border-yellow-800',
								mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
							)}
							style={{
								transitionProperty: 'opacity, transform, border-color',
								transitionDuration: '0.4s',
								transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
								transitionDelay: `${index * 80}ms`,
							}}
						>
							<button
								type='button'
								className='w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors rounded-lg'
								onClick={() => setExpandedPillar(isExpanded ? null : pillar.name)}
							>
								<Icon className='h-4 w-4 text-muted-foreground shrink-0' />
								<div className='w-28 sm:w-36 text-left shrink-0'>
									<span className='text-sm font-medium block'>
										{pillar.name}
									</span>
									{oneLiner && (
										<span className='text-[11px] text-muted-foreground leading-tight block'>
											{oneLiner}
										</span>
									)}
								</div>
								<div className='flex-1 min-w-0'>
									<div
										className='h-2 rounded-full bg-secondary overflow-hidden'
									>
										<div
											className={cn('h-full rounded-full', getProgressColor(pillar.score))}
											style={{
												width: mounted ? `${pillar.score}%` : '0%',
												transition: `width 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${200 + index * 80}ms`,
											}}
										/>
									</div>
								</div>
								<span className='text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0'>
									{pillar.score}
								</span>
								<span className={cn(
									'text-xs font-bold px-1.5 py-0.5 rounded shrink-0',
									getGradeColor(pillar.grade)
								)}>
									{pillar.grade}
								</span>
								<ChevronDown className={cn(
									'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
									isExpanded && 'rotate-180'
								)} />
							</button>

							{/* Expandable detail */}
							<div className={cn(
								'overflow-hidden transition-all duration-200',
								isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
							)}>
								<div className='px-3 pb-3 space-y-1.5 border-t mx-3'>
									<p className='text-sm text-muted-foreground pt-2'>
										{pillar.details}
									</p>
									<p className='text-sm flex items-start gap-1.5'>
										<Lightbulb className='h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5' />
										<span className='text-muted-foreground'>{pillar.recommendation}</span>
									</p>
								</div>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

// ─── Full Card (original layout, for standalone use) ─

function FullHealthCheck({ data }: { data: FinancialHealthScoreData }) {
	const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
	const colors = getScoreColor(data.overallScore);

	const topRecommendation = [...data.pillars]
		.filter((p) => p.grade !== 'A')
		.sort((a, b) => a.score - b.score)[0];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Financial Health Score</CardTitle>
			</CardHeader>
			<CardContent className='space-y-6'>
				{/* Score hero */}
				<div className='flex flex-col sm:flex-row items-center gap-6'>
					<ScoreRing score={data.overallScore} />
					<div className='text-center sm:text-left flex-1 min-w-0'>
						<p className={cn('text-2xl font-bold', colors.text)}>
							{data.overallLabel}
						</p>
						<p className='text-sm text-muted-foreground mt-1'>
							{getLabelDescription(data.overallLabel)}
						</p>
						{topRecommendation && (
							<div className='mt-3 pt-3 border-t flex items-start gap-2'>
								<Lightbulb className='h-4 w-4 text-yellow-500 shrink-0 mt-0.5' />
								<p className='text-sm text-muted-foreground'>
									{topRecommendation.recommendation}{' '}
									<span className='text-xs'>
										(
										<span className={cn(
											'inline-flex px-1 py-0.5 rounded font-bold',
											getGradeColor(topRecommendation.grade)
										)}>
											{topRecommendation.grade}
										</span>
										{' '}
										in {topRecommendation.name})
									</span>
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Pillar breakdown */}
				<div className='border-t pt-4 space-y-2'>
					{data.pillars.map((pillar) => {
						const Icon = PILLAR_ICONS[pillar.name] || Shield;
						const isExpanded = expandedPillar === pillar.name;
						const isWeakest = topRecommendation?.name === pillar.name;
						const oneLiner = PILLAR_ONE_LINERS[pillar.name];

						return (
							<div
								key={pillar.name}
								className={cn(
									'rounded-lg border transition-colors',
									isWeakest && 'border-yellow-300 dark:border-yellow-800'
								)}
							>
								<button
									type='button'
									className='w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors rounded-lg'
									onClick={() => setExpandedPillar(isExpanded ? null : pillar.name)}
								>
									<Icon className='h-4 w-4 text-muted-foreground shrink-0' />
									<div className='w-28 sm:w-36 text-left shrink-0'>
										<span className='text-sm font-medium block'>
											{pillar.name}
										</span>
										{oneLiner && (
											<span className='text-[11px] text-muted-foreground leading-tight block'>
												{oneLiner}
											</span>
										)}
									</div>
									<div className='flex-1 min-w-0'>
										<Progress
											value={pillar.score}
											className='h-2'
											indicatorClassName={getProgressColor(pillar.score)}
										/>
									</div>
									<span className='text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0'>
										{pillar.score}
									</span>
									<span className={cn(
										'text-xs font-bold px-1.5 py-0.5 rounded shrink-0',
										getGradeColor(pillar.grade)
									)}>
										{pillar.grade}
									</span>
									<ChevronDown className={cn(
										'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
										isExpanded && 'rotate-180'
									)} />
								</button>

								{/* Expandable detail */}
								<div className={cn(
									'overflow-hidden transition-all duration-200',
									isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
								)}>
									<div className='px-3 pb-3 space-y-1.5 border-t mx-3'>
										<p className='text-sm text-muted-foreground pt-2'>
											{pillar.details}
										</p>
										<p className='text-sm flex items-start gap-1.5'>
											<Lightbulb className='h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5' />
											<span className='text-muted-foreground'>{pillar.recommendation}</span>
										</p>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Main Component ─────────────────────────────────

export function FinancialHealthCheck({ data, variant = 'full' }: FinancialHealthCheckProps) {
	if (variant === 'badge') {
		return <HealthBadge data={data} />;
	}

	if (variant === 'score-only') {
		return <ScoreOnlyCard data={data} />;
	}

	if (variant === 'pillars-only') {
		return <PillarsOnlyCard data={data} />;
	}

	return <FullHealthCheck data={data} />;
}
