import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION_PX, sniffImage, validateImageBuffer } from "@/lib/media/image-signature";

function makePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function makeGif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(10);
  buf.write("GIF89a", 0, "ascii");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function makeWebp(): Buffer {
  const buf = Buffer.alloc(12);
  buf.write("RIFF", 0, "ascii");
  buf.write("WEBP", 8, "ascii");
  return buf;
}

/** A minimal SOI + SOF0 segment carrying just enough for the dimension reader. */
function makeJpeg(width: number, height: number): Buffer {
  const buf = Buffer.alloc(12);
  buf[0] = 0xff;
  buf[1] = 0xd8; // SOI
  buf[2] = 0xff;
  buf[3] = 0xc0; // SOF0
  buf.writeUInt16BE(8, 4); // segment length
  buf[6] = 8; // sample precision
  buf.writeUInt16BE(height, 7);
  buf.writeUInt16BE(width, 9);
  return buf;
}

describe("sniffImage", () => {
  it("identifies PNG and reads its dimensions", () => {
    expect(sniffImage(makePng(800, 600))).toEqual({ mime: "image/png", width: 800, height: 600 });
  });

  it("identifies JPEG and reads its dimensions", () => {
    expect(sniffImage(makeJpeg(1024, 768))).toEqual({ mime: "image/jpeg", width: 1024, height: 768 });
  });

  it("identifies GIF and reads its dimensions", () => {
    expect(sniffImage(makeGif(320, 240))).toEqual({ mime: "image/gif", width: 320, height: 240 });
  });

  it("identifies WEBP by signature without claiming dimensions", () => {
    expect(sniffImage(makeWebp())).toEqual({ mime: "image/webp", width: null, height: null });
  });

  it("rejects SVG and other non-raster content, including bytes that merely start with '<'", () => {
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
  });
});

describe("validateImageBuffer", () => {
  it("accepts a well-formed PNG within limits", () => {
    const result = validateImageBuffer(makePng(800, 600));
    expect(result.ok).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = validateImageBuffer(Buffer.alloc(0));
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the byte-size cap", () => {
    const result = validateImageBuffer(Buffer.alloc(MAX_IMAGE_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/smaller/i);
  });

  it("rejects an unsupported format", () => {
    const result = validateImageBuffer(Buffer.from("not an image"));
    expect(result.ok).toBe(false);
  });

  it("rejects dimensions over the pixel cap", () => {
    const result = validateImageBuffer(makePng(MAX_IMAGE_DIMENSION_PX + 1, 100));
    expect(result.ok).toBe(false);
  });

  it("rejects zero-valued dimensions", () => {
    const result = validateImageBuffer(makePng(0, 0));
    expect(result.ok).toBe(false);
  });
});
