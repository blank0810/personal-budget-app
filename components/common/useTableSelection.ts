'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export interface UseTableSelectionResult {
	selected: Set<string>;
	count: number;
	isSelected: (id: string) => boolean;
	toggle: (id: string) => void;
	toggleMany: (ids: string[], next: boolean) => void;
	toggleAllVisible: (visibleIds: string[]) => void;
	visibleState: (visibleIds: string[]) => 'none' | 'some' | 'all';
	clear: () => void;
}

/**
 * Per-page selection state for a data table. Stores selected row IDs in a
 * Set<string>. Automatically clears on filter / pagination change — pilot
 * scope does not persist selection across page or filter transitions (the
 * stale-ID edge case QA flagged).
 */
export function useTableSelection(): UseTableSelectionResult {
	const searchParams = useSearchParams();
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const signature = useMemo(() => searchParams.toString(), [searchParams]);

	// Selection must reset when URL filters / pagination change — stale IDs
	// across filter transitions are a known unsafe case (per QA review).
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state with external URL signal is the legitimate use case
		setSelected(new Set());
	}, [signature]);

	const toggle = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const toggleMany = useCallback((ids: string[], next: boolean) => {
		setSelected((prev) => {
			const updated = new Set(prev);
			for (const id of ids) {
				if (next) updated.add(id);
				else updated.delete(id);
			}
			return updated;
		});
	}, []);

	const toggleAllVisible = useCallback(
		(visibleIds: string[]) => {
			const allSelected = visibleIds.every((id) => selected.has(id));
			toggleMany(visibleIds, !allSelected);
		},
		[selected, toggleMany]
	);

	const visibleState = useCallback(
		(visibleIds: string[]): 'none' | 'some' | 'all' => {
			if (visibleIds.length === 0) return 'none';
			const selectedVisible = visibleIds.filter((id) =>
				selected.has(id)
			).length;
			if (selectedVisible === 0) return 'none';
			if (selectedVisible === visibleIds.length) return 'all';
			return 'some';
		},
		[selected]
	);

	const clear = useCallback(() => setSelected(new Set()), []);

	const isSelected = useCallback((id: string) => selected.has(id), [selected]);

	return {
		selected,
		count: selected.size,
		isSelected,
		toggle,
		toggleMany,
		toggleAllVisible,
		visibleState,
		clear,
	};
}
