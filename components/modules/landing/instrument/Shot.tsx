import Image from 'next/image';

/**
 * Shot — the frame every product screenshot sits in. Square edges, one
 * hairline border, a caption strip stating what the reader is looking
 * at. No browser chrome, no perspective tilt, no floating shadow: the
 * screenshot is evidence, and evidence is presented flat.
 *
 * Light captures only, in both themes. A `display: none` <img> is still
 * fetched, so shipping a light and a dark copy meant paying for two
 * downloads to show one. In the dark theme the shot is held very
 * slightly back (--shot-opacity) so it sits in the page rather than
 * glaring out of it.
 *
 * Regenerate with `node scripts/capture-shots.mjs`.
 */
export function Shot({
	slug,
	alt,
	caption,
	surface,
	priority = false,
	sizes = '(min-width: 1184px) 1184px, 100vw',
}: {
	slug: string;
	alt: string;
	caption: string;
	surface: string;
	priority?: boolean;
	sizes?: string;
}) {
	return (
		<figure>
			<Image
				src={`/shots/${slug}-light.png`}
				alt={alt}
				width={2880}
				height={1800}
				priority={priority}
				loading={priority ? undefined : 'lazy'}
				sizes={sizes}
			/>
			<figcaption>
				<span className='micro'>{caption}</span>
				<span className='micro'>{surface}</span>
			</figcaption>
		</figure>
	);
}
