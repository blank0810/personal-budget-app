import Image from 'next/image';

/**
 * Shot — the frame every product screenshot sits in.
 *
 * Square edges, one hairline border, and a caption strip stating what
 * the reader is looking at. No browser chrome, no perspective tilt, no
 * floating drop shadow: the screenshot is evidence, and evidence is
 * presented flat.
 *
 * Light captures only, in both themes. An earlier version shipped a
 * light and a dark capture and swapped them with CSS — but a
 * `display: none` <img> is still fetched, so every page paid for two
 * downloads (~110 KB each after optimisation) to show one. In the dark
 * theme the hairline frame and caption strip read the shot as a
 * photograph of the product, which is what it is. Dark captures are
 * still produced by the capture script if this is ever revisited.
 *
 * Regenerate with `node scripts/capture-shots.mjs`.
 */
export function Shot({
	slug,
	alt,
	caption,
	surface,
	priority = false,
	width = 2880,
	height = 1800,
	sizes = '(min-width: 1216px) 1216px, 100vw',
}: {
	/** File stem under /public/shots — resolves to `<slug>-light.png`. */
	slug: string;
	alt: string;
	/** Left-hand caption: what this screen is. */
	caption: string;
	/** Right-hand caption: where it lives in the app. */
	surface: string;
	priority?: boolean;
	width?: number;
	height?: number;
	sizes?: string;
}) {
	return (
		<figure className='st-shot'>
			<Image
				src={`/shots/${slug}-light.png`}
				alt={alt}
				width={width}
				height={height}
				priority={priority}
				loading={priority ? undefined : 'lazy'}
				sizes={sizes}
			/>

			<figcaption className='st-shot-caption'>
				<span className='st-micro'>{caption}</span>
				<span className='st-micro'>{surface}</span>
			</figcaption>
		</figure>
	);
}
