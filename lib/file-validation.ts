const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES  = new Set(["image/jpeg", "image/png", "image/webp"]);

type Valid   = { valid: true };
type Invalid = { valid: false; error: string };

/**
 * Three-layer image file guard:
 *   1. Extension allowlist  — jpg / jpeg / png / webp
 *   2. MIME type allowlist  — image/jpeg / image/png / image/webp
 *   3. Magic bytes          — rejects files with a renamed extension
 *
 * Async because reading magic bytes requires a slice of the file buffer.
 */
export async function validateImageFile(file: File): Promise<Valid | Invalid> {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Only JPG, PNG, and WebP images are accepted. ".${ext || "unknown"}" is not allowed.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Only JPG, PNG, and WebP images are accepted. The browser identified this file as "${file.type || "unknown type"}".`,
    };
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidMagicBytes(header)) {
    return {
      valid: false,
      error: "The file does not appear to be a valid image. Renaming a non-image file to a supported extension is not allowed.",
    };
  }

  return { valid: true };
}

function hasValidMagicBytes(b: Uint8Array): boolean {
  if (b.length < 4) return false;

  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true;

  // WebP: RIFF....WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return true;

  return false;
}
