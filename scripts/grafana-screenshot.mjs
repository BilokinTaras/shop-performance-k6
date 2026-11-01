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
await page.waitForFunction(() => document.querySelectorAll('[aria-label="Panel loading bar"]').length === 0, null, {
  timeout: 60000,
});
await page.waitForTimeout(2500);
// CLIP_HEIGHT keeps only the top of a long dashboard (e.g. without panels that have no data source).
const clipHeight = Number(process.env.CLIP_HEIGHT ?? '0');
await page.screenshot(
  clipHeight > 0
    ? { path: out, fullPage: true, clip: { x: 0, y: 0, width: 1600, height: clipHeight } }
    : { path: out, fullPage: true },
);
await browser.close();
console.log(`grafana-screenshot: ${out}`);
