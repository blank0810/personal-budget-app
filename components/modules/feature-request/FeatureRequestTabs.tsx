'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bug, Lightbulb, Sparkles, Palette, CheckCircle2 } from 'lucide-react';
import type { RequestCategory } from '@prisma/client';

interface FeatureRequestItem {
	id: string;
	title: string;
	description: string;
	category: RequestCategory;
	status: string;
	updatedAt: string;
	createdAt: string;
}

interface FeatureRequestTabsProps {
	requests: FeatureRequestItem[];
}

const CATEGORY_CONFIG: Record<
	string,
	{ label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
	BUG: {
		label: 'Bug',
		color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800',
		icon: Bug,
	},
	ENHANCEMENT: {
		label: 'Enhancement',
		color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800',
		icon: Lightbulb,
	},
	NEW_FEATURE: {
		label: 'New Feature',
		color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800',
		icon: Sparkles,
	},
	UI_UX: {
		label: 'UI/UX',
		color: 'text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800',
		icon: Palette,
	},
};

const STATUS_CONFIG: Record<string, { label: string; color: string } | undefined> = {
	REVIEWING: {
		label: 'Under Review',
		color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800',
	},
	PLANNED: {
		label: 'Planned',
		color: 'text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800',
	},
};

function timeAgo(dateStr: string): string {
	const now = new Date();
	const date = new Date(dateStr);
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCompletedOn(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function RequestCard({
	req,
	showCompletedBadge,
}: {
	req: FeatureRequestItem;
	showCompletedBadge?: boolean;
}) {
	const config = CATEGORY_CONFIG[req.category] ?? CATEGORY_CONFIG.NEW_FEATURE;
	const Icon = config.icon;
	const statusConfig = STATUS_CONFIG[req.status];

	return (
		<Card className='shadow-sm'>
			<CardContent className='p-4 space-y-2'>
				<div className='flex items-start justify-between gap-2'>
					<h4 className='text-sm font-semibold leading-snug'>{req.title}</h4>
					<Badge
						variant='outline'
						className={`shrink-0 text-[10px] px-1.5 py-0 ${config.color}`}
					>
						<Icon className='h-3 w-3 mr-0.5' />
						{config.label}
					</Badge>
				</div>
				<p className='text-xs text-muted-foreground line-clamp-2'>
					{req.description}
				</p>
				<div className='flex items-center justify-between gap-2'>
					{showCompletedBadge ? (
						<Badge
							variant='outline'
							className='text-[10px] px-1.5 py-0 text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800'
						>
							<CheckCircle2 className='h-3 w-3 mr-0.5' />
							Completed
						</Badge>
					) : statusConfig ? (
						<Badge
							variant='outline'
							className={`text-[10px] px-1.5 py-0 ${statusConfig.color}`}
						>
							{statusConfig.label}
						</Badge>
					) : (
						<span />
					)}
					<p className='text-[10px] text-muted-foreground/60'>
						{showCompletedBadge
							? `Completed on ${formatCompletedOn(req.updatedAt)}`
							: timeAgo(req.createdAt)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export function FeatureRequestTabs({ requests }: FeatureRequestTabsProps) {
	const openRequests = requests.filter((r) =>
		['NEW', 'REVIEWING', 'PLANNED'].includes(r.status)
	);
	const completedRequests = requests.filter((r) => r.status === 'COMPLETED');

	return (
		<Tabs defaultValue='open'>
			<TabsList className='mb-4'>
				<TabsTrigger value='open'>
					Open Requests ({openRequests.length})
				</TabsTrigger>
				<TabsTrigger value='completed'>
					Completed ({completedRequests.length})
				</TabsTrigger>
			</TabsList>

			<TabsContent value='open'>
				{openRequests.length === 0 ? (
					<p className='text-sm text-muted-foreground text-center py-8'>
						No open requests at the moment.
					</p>
				) : (
					<div className='grid gap-3 sm:grid-cols-2'>
						{openRequests.map((req) => (
							<RequestCard key={req.id} req={req} />
						))}
					</div>
				)}
			</TabsContent>

			<TabsContent value='completed'>
				{completedRequests.length === 0 ? (
					<p className='text-sm text-muted-foreground text-center py-8'>
						No completed requests yet.
					</p>
				) : (
					<div className='grid gap-3 sm:grid-cols-2'>
						{completedRequests.map((req) => (
							<RequestCard key={req.id} req={req} showCompletedBadge />
						))}
					</div>
				)}
			</TabsContent>
		</Tabs>
	);
}
