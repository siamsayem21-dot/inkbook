import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const OUT = "screenshots";
if (!existsSync(OUT)) await mkdir(OUT);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const pages = [
  { name: "01-homepage", url: "http://localhost:3000" },
  { name: "02-pricing", url: "http://localhost:3000/pricing" },
  { name: "03-login", url: "http://localhost:3000/login" },
  { name: "04-register", url: "http://localhost:3000/register" },
  { name: "05-booking-studio", url: "http://localhost:3000/book/ink-and-iron-studio" },
  { name: "06-artist-profile", url: "http://localhost:3000/book/ink-and-iron-studio/artist-1" },
  { name: "07-booking-form", url: "http://localhost:3000/book/ink-and-iron-studio/artist-1/book" },
  { name: "08-deposit", url: "http://localhost:3000/book/ink-and-iron-studio/artist-1/book/deposit" },
  { name: "09-consent", url: "http://localhost:3000/book/ink-and-iron-studio/artist-1/book/consent" },
  { name: "10-confirmation", url: "http://localhost:3000/book/ink-and-iron-studio/artist-1/book/confirmation" },
];

for (const { name, url } of pages) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`✓ ${name}`);
}

await browser.close();
console.log("All screenshots saved to ./screenshots/");
