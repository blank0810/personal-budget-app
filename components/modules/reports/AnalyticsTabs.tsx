'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Table as TableIcon } from 'lucide-react';

interface AnalyticsTabsProps {
	charts: React.ReactNode;
	ledger: React.ReactNode;
}

export function AnalyticsTabs({ charts, ledger }: AnalyticsTabsProps) {
	return (
		<Tabs defaultValue='overview' className='space-y-4'>
			<div className='flex items-center justify-between'>
				<TabsList>
					<TabsTrigger
						value='overview'
						className='flex items-center gap-2'
					>
						<BarChart3 className='h-4 w-4' />
						Analytics
					</TabsTrigger>
					<TabsTrigger
						value='ledger'
						className='flex items-center gap-2'
					>
						<TableIcon className='h-4 w-4' />
						General Ledger
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value='overview' className='space-y-4'>
				{charts}
			</TabsContent>

			<TabsContent value='ledger'>{ledger}</TabsContent>
		</Tabs>
	);
}
