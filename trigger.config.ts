import { additionalFiles } from '@trigger.dev/build/extensions/core';
import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
	project: 'proj_svvnpcaqwzzufzlkeecv',
	dirs: ['./trigger'],
	// Keep deployed and local task cwd behavior aligned. The PDF template loads
	// fonts from path.join(process.cwd(), 'public', 'fonts').
	legacyDevProcessCwdBehaviour: false,
	build: {
		// CurrencyFallback.ttf fixes currency glyphs that DM Sans does not carry.
		// Copy every registered font into the deployed task bundle.
		extensions: [additionalFiles({ files: ['./public/fonts/**'] })],
	},
	maxDuration: 900,
});
