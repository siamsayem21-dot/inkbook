import { describe, it, expect } from "vitest";
import { validateImageFile } from "@/lib/file-validation";

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const NOT_AN_IMAGE = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

function file(name: string, type: string, bytes: Uint8Array) {
  return new File([bytes as BlobPart], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a real JPEG", async () => {
    const result = await validateImageFile(file("photo.jpg", "image/jpeg", JPEG_HEADER));
    expect(result.valid).toBe(true);
  });

  it("accepts a real PNG", async () => {
    const result = await validateImageFile(file("photo.png", "image/png", PNG_HEADER));
    expect(result.valid).toBe(true);
  });

  it("accepts a real WebP", async () => {
    const result = await validateImageFile(file("photo.webp", "image/webp", WEBP_HEADER));
    expect(result.valid).toBe(true);
  });

  it("rejects a disallowed extension", async () => {
    const result = await validateImageFile(file("id.pdf", "application/pdf", NOT_AN_IMAGE));
    expect(result.valid).toBe(false);
  });

  it("rejects a mismatched MIME type even with an allowed extension", async () => {
    const result = await validateImageFile(file("id.jpg", "application/pdf", JPEG_HEADER));
    expect(result.valid).toBe(false);
  });

  it("rejects a PDF renamed to .jpg with a spoofed MIME type (magic-byte check)", async () => {
    const result = await validateImageFile(file("id.jpg", "image/jpeg", NOT_AN_IMAGE));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/does not appear to be a valid image/i);
  });
});
