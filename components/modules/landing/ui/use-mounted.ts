'use client';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => undefined;

/** false on SSR + first client render; true after mount. Gate any
 *  reduced-motion / matchMedia branch behind this to keep SSR === first paint. */
export function useMounted() {
	return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
