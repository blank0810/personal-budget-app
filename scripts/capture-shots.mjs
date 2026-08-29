/**
 * capture-shots.mjs — regenerate the product screenshots used on the
 * public marketing pages.
 *
 *   node scripts/capture-shots.mjs
 *
 * Why it's a script and not a one-off: screenshots rot. The previous
 * `public/dashboard.png` was eight months stale and showed a dashboard
 * that no longer exists. Re-run this after any UI change that the
 * marketing site shows off.
 *
 * Prerequisites:
 *   1. `docker compose up` — the app on :3000
 *   2. `docker compose exec app npx tsx scripts/demo-data.ts` — the
 *      neutral "Demo User" the shots are taken of
 *
 * Captures light only by default, because that is what the marketing
 * pages ship (see components/.../statement/Shot.tsx for why). Set
 * SHOT_THEMES=light,dark if dark captures are ever wanted again.
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

/* Playwright is not a project dependency — this is a local-only tool and
   the app must not carry a browser driver into its build. Resolve it
   through CJS `require`, which honours NODE_PATH (ESM `import` does not),
   so a cached copy can be pointed at:

     PW=$(find ~/.npm/_npx -maxdepth 3 -type d -name node_modules \
            | while read d; do [ -d "$d/playwright" ] && echo "$d"; done | head -1)
     NODE_PATH="$PW" node scripts/capture-shots.mjs
*/
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.SHOT_BASE_URL ?? 'http://localhost:3000';
const OUT = 'public/shots';
const EMAIL = 'demo@budget-app.com';
const PASSWORD = 'demo-password';

const SURFACES = [
	{ slug: 'dashboard', path: '/dashboard', wait: 'Health Ledger' },
	{ slug: 'transactions', path: '/transactions', wait: 'Transaction History' },
	{ slug: 'budgets', path: '/budgets', wait: 'Set Budget' },
	{ slug: 'reports', path: '/reports', wait: null },
];

const VIEWPORT = { width: 1440, height: 900 };
const THEMES = (process.env.SHOT_THEMES ?? 'light').split(',');

async function main() {
	await mkdir(OUT, { recursive: true });

	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: 2,
		reducedMotion: 'reduce', // freeze count-ups and chart entrances
	});
	const page = await context.newPage();

	await page.goto(`${BASE}/login`);
	await page.fill('input[type=email], input[name=email]', EMAIL);
	await page.fill('input[type=password], input[name=password]', PASSWORD);
	await page.click('button[type=submit]');
	await page.waitForURL('**/dashboard', { timeout: 30_000 });

	for (const theme of THEMES) {
		await page.evaluate((value) => {
			localStorage.setItem('theme', value);
		}, theme);

		for (const surface of SURFACES) {
			await page.goto(`${BASE}${surface.path}`);
			if (surface.wait) {
				await page
					.getByText(surface.wait, { exact: false })
					.first()
					.waitFor({ timeout: 20_000 })
					.catch(() => {});
			}
			/* Recharts' default animationDuration is 1500ms and its pie
			   starts at radius 0, so anything shorter photographs an empty
			   chart. prefers-reduced-motion does not opt Recharts out. */
			await page.waitForTimeout(3000);
			const file = `${OUT}/${surface.slug}-${theme}.png`;
			await page.screenshot({ path: file });
			console.log(`· ${file}`);
		}
	}

	await browser.close();
	console.log(
		`✓ ${SURFACES.length * THEMES.length} screenshots at ` +
			`${VIEWPORT.width}×${VIEWPORT.height} @2x (${THEMES.join(', ')})`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
