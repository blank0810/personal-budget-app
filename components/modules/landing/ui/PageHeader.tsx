import { SectionIndex } from './SectionIndex';

/**
 * PageHeader — compact page intro for the dedicated public routes
 * (/features, /how-it-works, /ai-advisor, /pricing, /faq).
 *
 * Renders the SectionIndex eyebrow ("01 · FEATURES"), the page's single
 * <h1> topic title (l-h2 display scale), and one supporting line. Pure SSR.
 *
 * IMPORTANT: this is the ONLY <h1> on each page — the reused section
 * components below it all use <h2>, so heading order stays correct.
 */
export function PageHeader({
	index,
	label,
	title,
	subtitle,
}: {
	index: string;
	label: string;
	title: string;
	subtitle: string;
}) {
	return (
		<section className='border-b border-l-border bg-l-surface-1'>
			<div className='mx-auto max-w-[1184px] px-6 py-16 md:px-10 md:py-20 xl:px-12'>
				<SectionIndex index={index} label={label} />
				<h1 className='l-h2 mt-5 max-w-3xl'>{title}</h1>
				<p className='mt-4 max-w-2xl text-base leading-relaxed text-l-text-2 sm:text-lg'>
					{subtitle}
				</p>
			</div>
		</section>
	);
}
