const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = 'C:\\Users\\asiacom\\Desktop\\inkbook\\screenshots';
const PAGE = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page.tsx';
const BEFORE = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page-before.tsx';
const BACKUP = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page-backup.tsx';

(async () => {
  // Swap in before version
  fs.copyFileSync(PAGE, BACKUP);
  fs.copyFileSync(BEFORE, PAGE);
  console.log('Swapped to BEFORE. Waiting for Next.js hot reload...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Wait for hot reload to pick up the change
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Hero
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-01-hero.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Journey
  await page.evaluate(() => window.scrollTo({ top: 1300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-02-journey.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // AI section
  await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-03-ai.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Quote
  await page.evaluate(() => window.scrollTo({ top: 3700, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-04-quote.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Pipeline
  await page.evaluate(() => window.scrollTo({ top: 4900, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-05-pipeline.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Client profile
  await page.evaluate(() => window.scrollTo({ top: 6300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'before-06-client-profile.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  await browser.close();

  // Restore current version
  fs.copyFileSync(BACKUP, PAGE);
  fs.unlinkSync(BACKUP);
  console.log('Restored AFTER version. Before screenshots saved to:', OUT);
})();
