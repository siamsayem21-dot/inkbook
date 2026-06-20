const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = 'C:\\Users\\asiacom\\Desktop\\inkbook\\screenshots';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SECTIONS = [
  { name: '01-hero',           selector: 'section.hero-bg',                    scrollTo: 0 },
  { name: '02-journey',        selector: null,                                  scrollTo: 1200 },
  { name: '03-ai',             selector: null,                                  scrollTo: 2400 },
  { name: '04-quote',          selector: null,                                  scrollTo: 3600 },
  { name: '05-pipeline',       selector: null,                                  scrollTo: 4800 },
  { name: '06-client-profile', selector: null,                                  scrollTo: 6200 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let animations settle

  // Full page screenshot
  await page.screenshot({ path: path.join(OUT, '00-full-page.png'), fullPage: true });

  // Hero
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '01-hero.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Journey
  await page.evaluate(() => window.scrollTo({ top: 1300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '02-journey.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // AI section
  await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '03-ai.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Quote
  await page.evaluate(() => window.scrollTo({ top: 3700, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '04-quote.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Pipeline / CRM
  await page.evaluate(() => window.scrollTo({ top: 4900, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '05-pipeline.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  // Client profile / CRM timeline
  await page.evaluate(() => window.scrollTo({ top: 6300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '06-client-profile.png'), clip: { x: 0, y: 0, width: 1440, height: 900 } });

  await browser.close();
  console.log('Done. Screenshots saved to:', OUT);
})();
