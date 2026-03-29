'use client';

import { useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { adminToggleFeatureFlagAction } from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';

interface FeatureFlag {
	id: string;
	key: string;
	description: string | null;
	enabled: boolean;
	overrideCount: number;
}

interface FeatureFlagTableProps {
	initialFlags: FeatureFlag[];
}

export function FeatureFlagTable({ initialFlags }: FeatureFlagTableProps) {
	const [flags, setFlags] = useState(initialFlags);
	const [loadingKey, setLoadingKey] = useState<string | null>(null);

	async function handleToggle(key: string, enabled: boolean) {
		setLoadingKey(key);
		const result = await adminToggleFeatureFlagAction(key, enabled);
		setLoadingKey(null);

		if (result.success) {
			setFlags((prev) =>
				prev.map((f) => (f.key === key ? { ...f, enabled } : f))
			);
			toast.success(`${key} ${enabled ? 'enabled' : 'disabled'}`);
		} else {
			toast.error(result.error || 'Failed');
		}
	}

	return (
		<div className='overflow-x-auto rounded border'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Key</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Overrides</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className='text-right'>Toggle</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{flags.map((flag) => (
						<TableRow key={flag.id}>
							<TableCell className='font-mono text-sm'>
								{flag.key}
							</TableCell>
							<TableCell className='text-sm text-muted-foreground'>
								{flag.description || '-'}
							</TableCell>
							<TableCell>
								<Badge
									variant='secondary'
									className='text-xs'
								>
									{flag.overrideCount} user
									{flag.overrideCount !== 1 ? 's' : ''}
								</Badge>
							</TableCell>
							<TableCell>
								<Badge
									variant={
										flag.enabled ? 'default' : 'secondary'
									}
									className='text-xs'
								>
									{flag.enabled ? 'Enabled' : 'Disabled'}
								</Badge>
							</TableCell>
							<TableCell className='text-right'>
								<Switch
									checked={flag.enabled}
									disabled={loadingKey === flag.key}
									onCheckedChange={(checked) =>
										handleToggle(flag.key, checked)
									}
								/>
							</TableCell>
						</TableRow>
					))}
					{flags.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={5}
								className='text-center py-8 text-muted-foreground'
							>
								No feature flags configured
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
