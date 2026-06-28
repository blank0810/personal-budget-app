/**
 * /features OG image — re-exports the root Lagoon brand card so this route
 * gets an explicit og:image even when page-level openGraph metadata is present.
 */
export {
	default,
	alt,
	size,
	contentType,
} from '../opengraph-image';
