'use client';

import { useEffect } from 'react';

export function ScrollReveal() {
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);

		document
			.querySelectorAll('.landing-reveal')
			.forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	}, []);

	return null;
}
