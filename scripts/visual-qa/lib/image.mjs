/**
 * Visual QA V3 -- image resizing without a native image-processing
 * dependency (no sharp/jimp installed in this repo). Reuses Playwright,
 * which is already a project dependency, purely as a canvas renderer: loads
 * the PNG into a headless page and downscales it via <canvas> before
 * base64-encoding for the vision API. Full-page screenshots (some several
 * thousand pixels tall) would otherwise be far larger than useful/allowed
 * for a classification call.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

let browserPromise;
async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch();
  return browserPromise;
}

/**
 * @param {string} filePath
 * @param {number} [maxDim] longest edge, in px, after resizing
 * @returns {Promise<{ base64: string, mediaType: string } | null>} null if the file doesn't exist
 */
export async function loadImageForVision(filePath, maxDim = 1200) {
  if (!filePath) return null;
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    return null;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    const base64 = await page.evaluate(
      async ({ dataUrl, maxDim }) => {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("image decode failed"));
          i.src = dataUrl;
        });
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
      },
      { dataUrl, maxDim },
    );
    return { base64, mediaType: "image/jpeg" };
  } finally {
    await page.close();
  }
}

export async function closeImageResizer() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = undefined;
  }
}
