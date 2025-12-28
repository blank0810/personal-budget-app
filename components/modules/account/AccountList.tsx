'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, FileText } from 'lucide-react';
import { deleteAccountAction } from '@/server/modules/account/account.controller';
import { formatCurrency } from '@/lib/formatters';
import { Account } from '@prisma/client';
import Link from 'next/link';

interface AccountListProps {
	accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
	async function handleDelete(id: string) {
		if (
			confirm(
				'Are you sure you want to delete this account? This action cannot be undone if there are related transactions.'
			)
		) {
			const result = await deleteAccountAction(id);
			if (result?.error) {
				alert(result.error);
			}
		}
	}

	return (
		<div className='rounded-md border bg-card'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Type</TableHead>
						<TableHead className='text-right'>Balance</TableHead>
						<TableHead className='w-[100px] text-right'>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{accounts.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={4}
								className='text-center h-24 text-muted-foreground'
							>
								No accounts found.
							</TableCell>
						</TableRow>
					) : (
						accounts.map((account) => (
							<TableRow key={account.id}>
								<TableCell className='font-medium'>
									{account.name}
								</TableCell>
								<TableCell>
									<span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20'>
										{account.type}
									</span>
								</TableCell>
								<TableCell className='text-right'>
									<div className='font-bold ml-auto'>
										{formatCurrency(
											Number(account.balance)
										)}
									</div>
									{account.type === 'CREDIT' &&
										account.creditLimit && (
											<div className='flex flex-col items-end gap-1 mt-1'>
												<div className='text-xs text-muted-foreground'>
													{Math.round(
														((Number(
															account.creditLimit
														) -
															Number(
																account.balance
															)) /
															Number(
																account.creditLimit
															)) *
															100
													)}
													% of{' '}
													{formatCurrency(
														Number(
															account.creditLimit
														)
													)}
												</div>
												<div className='w-24 h-1.5 bg-secondary rounded-full overflow-hidden'>
													<div
														className={`h-full ${
															(Number(
																account.creditLimit
															) -
																Number(
																	account.balance
																)) /
																Number(
																	account.creditLimit
																) <
															0.3
																? 'bg-green-500'
																: (Number(
																		account.creditLimit
																  ) -
																		Number(
																			account.balance
																		)) /
																		Number(
																			account.creditLimit
																		) <
																  0.5
																? 'bg-yellow-500'
																: 'bg-red-500'
														}`}
														style={{
															width: `${Math.min(
																((Number(
																	account.creditLimit
																) -
																	Number(
																		account.balance
																	)) /
																	Number(
																		account.creditLimit
																	)) *
																	100,
																100
															)}%`,
														}}
													/>
												</div>
											</div>
										)}
								</TableCell>
								<TableCell>
									<div className='flex justify-end gap-2'>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8 text-muted-foreground hover:text-primary'
											asChild
										>
											<Link
												href={`/accounts/${account.id}`}
											>
												<FileText className='h-4 w-4' />
											</Link>
										</Button>
										<Button
											variant='ghost'
											size='icon'
											className='h-8 w-8 text-destructive'
											onClick={() =>
												handleDelete(account.id)
											}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
