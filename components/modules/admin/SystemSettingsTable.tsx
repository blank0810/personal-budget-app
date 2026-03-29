'use client';

import { useState, useTransition } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { adminUpdateSystemSettingAction } from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';

interface SystemSetting {
	id: string;
	key: string;
	value: string;
	label: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
}

interface SystemSettingsTableProps {
	initialSettings: SystemSetting[];
}

export function SystemSettingsTable({
	initialSettings,
}: SystemSettingsTableProps) {
	const [settings, setSettings] = useState(initialSettings);
	const [editValues, setEditValues] = useState<Record<string, string>>(() => {
		const map: Record<string, string> = {};
		for (const s of initialSettings) {
			map[s.key] = s.value;
		}
		return map;
	});
	const [savingKey, setSavingKey] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function handleValueChange(key: string, value: string) {
		setEditValues((prev) => ({ ...prev, [key]: value }));
	}

	function handleSave(key: string) {
		const newValue = editValues[key];
		if (newValue === undefined) return;

		setSavingKey(key);
		startTransition(async () => {
			const result = await adminUpdateSystemSettingAction({
				key,
				value: newValue,
			});
			setSavingKey(null);

			if ('error' in result) {
				toast.error(result.error);
			} else {
				setSettings((prev) =>
					prev.map((s) =>
						s.key === key ? { ...s, value: newValue } : s
					)
				);
				toast.success(`Setting "${key}" updated`);
			}
		});
	}

	function isDirty(key: string) {
		const setting = settings.find((s) => s.key === key);
		return setting ? editValues[key] !== setting.value : false;
	}

	return (
		<div className='overflow-x-auto rounded border'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Key</TableHead>
						<TableHead>Label</TableHead>
						<TableHead>Value</TableHead>
						<TableHead className='text-right'>Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{settings.map((setting) => {
						const isSaving = savingKey === setting.key;
						const dirty = isDirty(setting.key);

						return (
							<TableRow key={setting.id}>
								<TableCell className='font-mono text-sm'>
									{setting.key}
								</TableCell>
								<TableCell className='text-sm text-muted-foreground'>
									{setting.label || '-'}
								</TableCell>
								<TableCell>
									<Input
										value={editValues[setting.key] ?? ''}
										onChange={(e) =>
											handleValueChange(
												setting.key,
												e.target.value
											)
										}
										onKeyDown={(e) => {
											if (e.key === 'Enter' && dirty) {
												handleSave(setting.key);
											}
										}}
										disabled={isSaving}
										className='max-w-xs h-8 text-sm'
									/>
								</TableCell>
								<TableCell className='text-right'>
									<Button
										variant='outline'
										size='sm'
										onClick={() =>
											handleSave(setting.key)
										}
										disabled={
											isSaving || isPending || !dirty
										}
									>
										{isSaving ? (
											<Loader2 className='h-3 w-3 animate-spin mr-1' />
										) : (
											<Save className='h-3 w-3 mr-1' />
										)}
										Save
									</Button>
								</TableCell>
							</TableRow>
						);
					})}
					{settings.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={4}
								className='text-center py-8 text-muted-foreground'
							>
								No system settings configured
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
