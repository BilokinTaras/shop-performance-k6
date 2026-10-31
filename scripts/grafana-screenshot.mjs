// Takes real screenshots of provisioned Grafana dashboards for a time window (used in reports).
// Usage: node scripts/grafana-screenshot.mjs <dashboard-uid> <from-ms|now-15m> <to-ms|now> <out.png> [extra query]
// Needs @playwright/test, borrowed from ../shop-e2e-playwright (no extra dependency here).
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('../shop-e2e-playwright/package.json'));
const { chromium } = require('@playwright/test');
const [uid, from, to, out, extra = ''] = process.argv.slice(2);
const base = process.env.GRAFANA_URL ?? 'http://localhost:3300';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(`${base}/d/${uid}?orgId=1&from=${from}&to=${to}&kiosk${extra}`, { waitUntil: 'domcontentloaded' });
// Panels load asynchronously; wait until no panel shows a loading indicator, then a moment for rendering.
await page.waitForFunction(() => document.querySelectorAll('[aria-label="Panel loading bar"]').length === 0, null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`grafana-screenshot: ${out}`);
