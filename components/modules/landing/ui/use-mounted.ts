'use client';
import { useEffect, useState } from 'react';

/** false on SSR + first client render; true after mount. Gate any
 *  reduced-motion / matchMedia branch behind this to keep SSR === first paint. */
export function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	return mounted;
}
