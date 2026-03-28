'use client';

import { useTransition, useCallback } from 'react';
import { toast } from 'sonner';

type ActionResult<T = unknown> = { error: string } | { success: true; data?: T };

interface UseServerActionOptions<T> {
    onSuccess?: (data?: T) => void;
    successMessage?: string;
}

export function useServerAction<TInput, TResult = unknown>(
    action: (input: TInput) => Promise<ActionResult<TResult>>,
    options?: UseServerActionOptions<TResult>,
) {
    const [isPending, startTransition] = useTransition();

    const execute = useCallback(
        (input: TInput) => {
            startTransition(async () => {
                const result = await action(input);
                if ('error' in result) {
                    toast.error(result.error);
                } else {
                    if (options?.successMessage) toast.success(options.successMessage);
                    options?.onSuccess?.(result.data);
                }
            });
        },
        [action, options],
    );

    return { execute, isPending };
}
