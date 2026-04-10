'use client';

import {
    Wallet,
    PiggyBank,
    CreditCard,
    Landmark,
    TrendingUp,
    FileText,
    Church,
    Trash2,
    ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCurrency } from '@/lib/contexts/currency-context';
import { Account } from '@prisma/client';
import {
    groupAccountsByClass,
    ACCOUNT_CLASS_ORDER,
    ACCOUNT_CLASS_META,
    type AccountClass,
} from '@/lib/account-utils';
import { cn } from '@/lib/utils';

// Icon badge colors for each row
const ACCOUNT_COLOR_MAP: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
    silver: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    black: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
};

const ACCOUNT_TYPE_ICON: Record<string, React.ElementType> = {
    BANK: Landmark,
    CASH: Wallet,
    SAVINGS: PiggyBank,
    INVESTMENT: TrendingUp,
    CREDIT: CreditCard,
    LOAN: FileText,
    TITHE: Church,
};

// ── AccountChips (unchanged from current) ─────────────────────────────────

const TYPE_CHIPS = [
    { value: null, label: 'All', icon: null },
    { value: 'liquid' as AccountClass, label: 'Liquid Assets', icon: Wallet },
    { value: 'savings' as AccountClass, label: 'Savings & Investments', icon: PiggyBank },
    { value: 'liability' as AccountClass, label: 'Liabilities', icon: CreditCard },
] as const;

interface AccountChipsProps {
    accounts: Account[];
    activeGroup: AccountClass | null;
    onGroupChange: (group: AccountClass | null) => void;
}

export function AccountChips({ accounts, activeGroup, onGroupChange }: AccountChipsProps) {
    const groups = groupAccountsByClass(accounts);
    return (
        <div className='flex items-center gap-2 flex-wrap'>
            {TYPE_CHIPS.map((chip) => {
                const count = chip.value ? groups[chip.value]?.length ?? 0 : accounts.length;
                if (chip.value && count === 0) return null;
                const Icon = chip.icon;
                return (
                    <button
                        key={chip.label}
                        type='button'
                        onClick={() => onGroupChange(chip.value)}
                        className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5',
                            activeGroup === chip.value ||
                                (chip.value === null && activeGroup === null)
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:bg-accent'
                        )}
                    >
                        {Icon && <Icon className='h-3 w-3' />}
                        {chip.label}
                        <span className='opacity-70'>({count})</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── AccountList (dense, table-based, grouped by class) ───────────────────

interface AccountListProps {
    accounts: Account[];
    activeGroup: AccountClass | null;
    onDelete: (id: string) => void;
}

export function AccountList({ accounts, activeGroup, onDelete }: AccountListProps) {
    const { formatCurrency } = useCurrency();
    const groups = groupAccountsByClass(accounts);

    if (accounts.length === 0) {
        return (
            <div className='rounded-md border bg-card p-8 text-center text-muted-foreground'>
                No accounts found. Add your first account to get started.
            </div>
        );
    }

    const visibleGroups = activeGroup
        ? [activeGroup]
        : ACCOUNT_CLASS_ORDER.filter((cls) => groups[cls].length > 0);

    return (
        <div className='space-y-6'>
            {visibleGroups.map((cls) => {
                const groupAccounts = groups[cls];
                if (groupAccounts.length === 0) return null;
                const meta = ACCOUNT_CLASS_META[cls];
                const Icon = meta.icon;
                const subtotal = groupAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
                const isLiability = cls === 'liability';

                return (
                    <section key={cls} className='space-y-2'>
                        <div className='flex items-center justify-between px-1'>
                            <h3
                                className={cn(
                                    'text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5',
                                    meta.color === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                                    meta.color === 'blue' && 'text-blue-600 dark:text-blue-400',
                                    meta.color === 'red' && 'text-red-600 dark:text-red-400'
                                )}
                            >
                                <Icon className='h-4 w-4' />
                                {meta.label}
                                <span className='opacity-70'>({groupAccounts.length})</span>
                            </h3>
                            <span
                                className={cn(
                                    'text-sm font-bold tabular-nums',
                                    isLiability ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                                )}
                            >
                                {formatCurrency(subtotal)}
                            </span>
                        </div>

                        <div className='rounded-md border bg-card'>
                            <Table className='table-fixed'>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='w-[40%]'>Name</TableHead>
                                        <TableHead className='hidden sm:table-cell w-[20%]'>Type</TableHead>
                                        <TableHead className='w-[25%] text-right'>Balance</TableHead>
                                        <TableHead className='w-[15%] text-right'>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupAccounts.map((account) => (
                                        <AccountRow key={account.id} account={account} onDelete={onDelete} />
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function AccountRow({
    account,
    onDelete,
}: {
    account: Account;
    onDelete: (id: string) => void;
}) {
    const { formatCurrency } = useCurrency();
    const TypeIcon = ACCOUNT_TYPE_ICON[account.type] ?? Landmark;
    const colorClass =
        (account.color && ACCOUNT_COLOR_MAP[account.color]) ||
        'bg-muted text-muted-foreground';

    return (
        <TableRow>
            <TableCell className='font-medium'>
                <Link
                    href={`/accounts/${account.id}`}
                    className='flex items-center gap-2 hover:underline'
                >
                    <span
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full shrink-0',
                            colorClass
                        )}
                    >
                        <TypeIcon className='h-3.5 w-3.5' />
                    </span>
                    <span className='truncate'>{account.name}</span>
                </Link>
            </TableCell>
            <TableCell className='hidden sm:table-cell'>
                <Badge variant='secondary' className='text-[10px] font-medium'>
                    {account.type}
                </Badge>
            </TableCell>
            <TableCell className='text-right font-bold tabular-nums'>
                {formatCurrency(Number(account.balance))}
            </TableCell>
            <TableCell className='text-right'>
                <div className='flex justify-end gap-1'>
                    <Button variant='ghost' size='icon' className='h-8 w-8' asChild>
                        <Link href={`/accounts/${account.id}`}>
                            <ExternalLink className='h-4 w-4' />
                        </Link>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 text-destructive hover:text-destructive'
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {account.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone if the account has related transactions.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onDelete(account.id)}
                                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TableCell>
        </TableRow>
    );
}
