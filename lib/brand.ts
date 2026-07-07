export type Brand = {
  full: string;
  subtle: string;
  medium: string;
  textOnBrand: string;
};

/** Derives brand accent shades + a readable text color from a studio's primary hex color. */
export function getBrand(hex: string): Brand {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    full: hex,
    subtle: `rgba(${r},${g},${b},0.25)`,
    medium: `rgba(${r},${g},${b},0.8)`,
    textOnBrand: luminance > 0.5 ? "#000000" : "#ffffff",
  };
}
