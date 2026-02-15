'use client';

import { useState, useTransition } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import { sendManualReportAction } from '@/server/modules/report/report.controller';

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

interface SendReportDialogProps {
	accountCreatedYear: number;
}

export function SendReportDialog({ accountCreatedYear }: SendReportDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
	const [selectedYear, setSelectedYear] = useState(String(currentYear));

	// Build year options from current year down to account creation year
	const yearOptions: number[] = [];
	for (let y = currentYear; y >= accountCreatedYear; y--) {
		yearOptions.push(y);
	}

	const monthLabel = MONTHS[Number(selectedMonth) - 1];

	function handleSend() {
		startTransition(async () => {
			try {
				const result = await sendManualReportAction(
					Number(selectedMonth),
					Number(selectedYear)
				);
				if ('error' in result) {
					toast.error(result.error);
				} else {
					toast.success(result.message);
					setOpen(false);
				}
			} catch {
				toast.error('Failed to generate report. Please try again.');
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Send className="h-4 w-4 mr-2" />
					Send Report
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[400px]">
				<DialogHeader>
					<DialogTitle>Email Monthly Report</DialogTitle>
					<DialogDescription>
						Generate your financial snapshot and send it to your
						registered email as a PDF.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Month</label>
							<Select
								value={selectedMonth}
								onValueChange={setSelectedMonth}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MONTHS.map((name, i) => (
										<SelectItem
											key={i}
											value={String(i + 1)}
										>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<label className="text-sm font-medium">Year</label>
							<Select
								value={selectedYear}
								onValueChange={setSelectedYear}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{yearOptions.map((y) => (
										<SelectItem
											key={y}
											value={String(y)}
										>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<p className="text-sm text-muted-foreground">
						This will generate your financial snapshot for{' '}
						<span className="font-medium text-foreground">
							{monthLabel} {selectedYear}
						</span>{' '}
						and send it to your email.
					</p>
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleSend} disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<Send className="h-4 w-4 mr-2" />
								Send Report
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
