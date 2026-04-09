'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { AccountForm } from './AccountForm';
import { AccountList, AccountChips } from './AccountList';
import { AccountKPICards, type AccountKPIData } from './AccountKPICards';
import type { AccountClass } from '@/lib/account-utils';
import { deleteAccountAction } from '@/server/modules/account/account.controller';
import { Account } from '@prisma/client';

interface AccountPageContainerProps {
    accounts: Account[];
    summary: AccountKPIData;
}

export function AccountPageContainer({ accounts, summary }: AccountPageContainerProps) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [activeGroup, setActiveGroup] = useState<AccountClass | null>(null);

    const handleSuccess = useCallback(() => {
        setSheetOpen(false);
        router.refresh();
    }, [router]);

    const handleDelete = useCallback(
        async (id: string) => {
            const result = await deleteAccountAction(id);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success('Account deleted');
                router.refresh();
            }
        },
        [router]
    );

    return (
        <>
            <div className='flex items-center justify-between'>
                <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Accounts</h1>
                <Button size='sm' className='gap-2 text-xs' onClick={() => setSheetOpen(true)}>
                    <Plus className='h-3.5 w-3.5' />
                    Add Account
                </Button>
            </div>

            <AccountKPICards {...summary} />

            <AccountChips
                accounts={accounts}
                activeGroup={activeGroup}
                onGroupChange={setActiveGroup}
            />

            <AccountList
                accounts={accounts}
                activeGroup={activeGroup}
                onDelete={handleDelete}
            />

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side='right' className='w-full sm:max-w-md flex flex-col gap-0 p-0'>
                    <SheetHeader className='border-b px-4 py-4'>
                        <SheetTitle>Add Account</SheetTitle>
                        <SheetDescription>
                            Create a new bank account, credit card, or loan
                        </SheetDescription>
                    </SheetHeader>
                    <div className='flex flex-1 flex-col overflow-y-auto px-4 py-4'>
                        <AccountForm onSuccess={handleSuccess} />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
