import "server-only";

/** 8 MB; tighten once Phase 0 verifies LinkedIn's actual Images API limit. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** A sanity bound on pixel dimensions, not a verified LinkedIn limit. */
export const MAX_IMAGE_DIMENSION_PX = 8000;

export type SupportedImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
export type SniffedImage = { mime: SupportedImageMime; width: number | null; height: number | null };

function isPng(buf: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return buf.length >= 8 && signature.every((byte, index) => buf[index] === byte);
}
function readPngDimensions(buf: Buffer) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}
function readJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    offset += 2 + segmentLength;
  }
  return null;
}

function isGif(buf: Buffer): boolean {
  const header = buf.subarray(0, 6).toString("ascii");
  return header === "GIF87a" || header === "GIF89a";
}
function readGifDimensions(buf: Buffer) {
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function isWebp(buf: Buffer): boolean {
  return buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
}

/**
 * Identifies an image by its magic bytes rather than the browser-supplied
 * MIME type. Anything that isn't one of these four raster signatures is
 * rejected outright — including SVG, which is deliberately unsupported
 * because it can carry script content (implementation.MD Phase 4 item 3).
 * WEBP dimensions are not parsed (its bitstream layout varies by codec);
 * byte size and signature are still enforced for it.
 */
export function sniffImage(buf: Buffer): SniffedImage | null {
  if (isPng(buf)) return { mime: "image/png", ...readPngDimensions(buf) };
  if (isJpeg(buf)) return { mime: "image/jpeg", ...(readJpegDimensions(buf) ?? { width: null, height: null }) };
  if (isGif(buf)) return { mime: "image/gif", ...readGifDimensions(buf) };
  if (isWebp(buf)) return { mime: "image/webp", width: null, height: null };
  return null;
}

export type ImageValidationResult = { ok: true; sniffed: SniffedImage } | { ok: false; reason: string };

export function validateImageBuffer(buf: Buffer): ImageValidationResult {
  if (buf.byteLength === 0) return { ok: false, reason: "The image file is empty." };
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, reason: `Images must be ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB or smaller.` };
  }

  const sniffed = sniffImage(buf);
  if (!sniffed) return { ok: false, reason: "Unsupported image format. Use PNG, JPEG, GIF, or WEBP." };

  if (sniffed.width !== null && sniffed.height !== null) {
    if (sniffed.width <= 0 || sniffed.height <= 0) return { ok: false, reason: "The image dimensions could not be read." };
    if (sniffed.width > MAX_IMAGE_DIMENSION_PX || sniffed.height > MAX_IMAGE_DIMENSION_PX) {
      return { ok: false, reason: `Images must be ${MAX_IMAGE_DIMENSION_PX}px or smaller on each side.` };
    }
  }

  return { ok: true, sniffed };
}
