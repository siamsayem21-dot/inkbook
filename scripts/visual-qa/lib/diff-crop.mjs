/**
 * Visual QA V3 -- crop baseline/actual images down to the regions a diff
 * image actually highlights, before sending them to the vision model.
 *
 * These are full-page screenshots of a page that can be many thousands of
 * pixels tall, and this particular page also has some genuinely dynamic,
 * live-updating decorative content (animated dashboard stat counters) that
 * differs between any two captures regardless of any real code change. A
 * single global bounding box over "all differing pixels" gets swamped by
 * that unrelated noise and can miss (or dilute) a real, separate, smaller
 * regression elsewhere on the page.
 *
 * Instead: find the DISTINCT connected clusters of differing pixels (a
 * coarse grid-based connected-component labeling -- fast enough for a
 * full-page image, and sufficient to separate spatially distant regions
 * like "top of page" vs "footer"), and crop/return each of the largest few
 * clusters separately so the model can judge each one on its own, rather
 * than one blended, misleading region.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

let browserPromise;
async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch();
  return browserPromise;
}

function toDataUrl(filePath) {
  const buffer = readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * @param {string} diffPath
 * @param {number} maxRegions
 * @returns {Promise<Array<{x:number,y:number,w:number,h:number}>>}
 */
async function findDiffRegions(diffPath, maxRegions = 3) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const dataUrl = toDataUrl(diffPath);
    return await page.evaluate(async ({ dataUrl, maxRegions }) => {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("diff image decode failed"));
        i.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const CELL = 24; // coarse grid cell size, in source pixels
      const gridW = Math.ceil(canvas.width / CELL);
      const gridH = Math.ceil(canvas.height / CELL);
      const hot = new Uint8Array(gridW * gridH); // 1 = this cell contains >=1 saturated (diff-highlighted) pixel
      const hotCount = new Int32Array(gridW * gridH); // how many saturated pixels, for weighting

      // Playwright/pixelmatch highlights differing pixels in a saturated
      // color against an otherwise desaturated/faded backdrop. A pixel with
      // a large spread between its max and min channel is "saturated" -- a
      // reasonable, diff-tool-agnostic detector.
      for (let y = 0; y < canvas.height; y++) {
        const gy = (y / CELL) | 0;
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const spread = Math.max(r, g, b) - Math.min(r, g, b);
          if (spread > 60) {
            const gx = (x / CELL) | 0;
            const idx = gy * gridW + gx;
            hot[idx] = 1;
            hotCount[idx]++;
          }
        }
      }

      // Connected-component labeling over the coarse grid (4-connectivity),
      // stack-based flood fill -- the grid is small (tens of thousands of
      // cells at most), so this is fast.
      const visited = new Uint8Array(gridW * gridH);
      const components = [];
      for (let start = 0; start < gridW * gridH; start++) {
        if (!hot[start] || visited[start]) continue;
        const stack = [start];
        visited[start] = 1;
        let minGX = gridW, minGY = gridH, maxGX = -1, maxGY = -1, weight = 0;
        while (stack.length) {
          const idx = stack.pop();
          const gx = idx % gridW;
          const gy = (idx / gridW) | 0;
          if (gx < minGX) minGX = gx;
          if (gy < minGY) minGY = gy;
          if (gx > maxGX) maxGX = gx;
          if (gy > maxGY) maxGY = gy;
          weight += hotCount[idx];
          const cx = idx % gridW;
          // Left/right neighbors must stay within the same row -- idx-1/idx+1
          // on a flat array otherwise wraps across row boundaries at the
          // grid's left/right edges, treating unrelated cells as adjacent.
          const neighbors = [
            cx > 0 ? idx - 1 : -1,
            cx < gridW - 1 ? idx + 1 : -1,
            idx - gridW,
            idx + gridW,
          ];
          for (const n of neighbors) {
            if (n < 0 || n >= gridW * gridH) continue;
            if (!hot[n] || visited[n]) continue;
            visited[n] = 1;
            stack.push(n);
          }
        }
        components.push({
          x: minGX * CELL,
          y: minGY * CELL,
          w: (maxGX - minGX + 1) * CELL,
          h: (maxGY - minGY + 1) * CELL,
          weight,
        });
      }

      components.sort((a, b) => b.weight - a.weight);
      return components.slice(0, maxRegions).map(({ x, y, w, h }) => ({
        x,
        y,
        w: Math.min(w, canvas.width - x),
        h: Math.min(h, canvas.height - y),
      }));
    }, { dataUrl, maxRegions });
  } finally {
    await page.close();
  }
}

/**
 * Crops filePath to the given box (with padding, clamped to image bounds)
 * and returns it as a base64 JPEG.
 */
async function cropAndEncode(filePath, box, padding, maxDim) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const dataUrl = toDataUrl(filePath);
    return await page.evaluate(
      async ({ dataUrl, box, padding, maxDim }) => {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("image decode failed"));
          i.src = dataUrl;
        });
        const x = Math.max(0, box.x - padding);
        const y = Math.max(0, box.y - padding);
        const w = Math.min(img.naturalWidth - x, box.w + padding * 2);
        const h = Math.min(img.naturalHeight - y, box.h + padding * 2);

        const scale = Math.min(1, maxDim / Math.max(w, h));
        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, x, y, w, h, 0, 0, outW, outH);
        return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
      },
      { dataUrl, box, padding, maxDim },
    );
  } finally {
    await page.close();
  }
}

/**
 * @param {{ baselinePath: string|null, screenshotPath: string|null, diffPath: string|null }} entry
 * @returns {Promise<Array<{ baseline: {base64,mediaType}|null, actual: {base64,mediaType}|null }>>}
 */
export async function loadDiffRegionsForVision(entry, { padding = 100, maxDim = 900, maxRegions = 3 } = {}) {
  if (!entry.diffPath) return [];

  const boxes = await findDiffRegions(entry.diffPath, maxRegions).catch(() => []);
  if (boxes.length === 0) return [];

  const regions = [];
  for (const box of boxes) {
    const [baselineB64, actualB64] = await Promise.all([
      entry.baselinePath ? cropAndEncode(entry.baselinePath, box, padding, maxDim).catch(() => null) : null,
      entry.screenshotPath ? cropAndEncode(entry.screenshotPath, box, padding, maxDim).catch(() => null) : null,
    ]);
    regions.push({
      baseline: baselineB64 ? { base64: baselineB64, mediaType: "image/jpeg" } : null,
      actual: actualB64 ? { base64: actualB64, mediaType: "image/jpeg" } : null,
    });
  }
  return regions;
}

export async function closeDiffCropper() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = undefined;
  }
}
