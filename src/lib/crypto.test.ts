import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { decrypt, encrypt, EncryptionError } from "@/lib/crypto";

beforeEach(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("crypto", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "urn:li:person:abc123 super-secret-token";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("produces a versioned four-part envelope with a fresh IV each time", () => {
    const first = encrypt("same-plaintext");
    const second = encrypt("same-plaintext");
    expect(first.split(".")).toHaveLength(4);
    expect(first.split(".")[0]).toBe("v1");
    expect(first).not.toBe(second); // a random IV means identical plaintext still yields different ciphertext
  });

  it("rejects a tampered ciphertext", () => {
    const [version, iv, tag, ciphertext] = encrypt("do not tamper with me").split(".");
    const tamperedBytes = Buffer.from(ciphertext, "base64");
    tamperedBytes[0] ^= 0xff;
    const tampered = [version, iv, tag, tamperedBytes.toString("base64")].join(".");
    expect(() => decrypt(tampered)).toThrow(EncryptionError);
  });

  it("rejects a tampered auth tag", () => {
    const [version, iv, tag, ciphertext] = encrypt("do not tamper with this tag").split(".");
    const tamperedTag = Buffer.from(tag, "base64");
    tamperedTag[0] ^= 0xff;
    const tampered = [version, iv, tamperedTag.toString("base64"), ciphertext].join(".");
    expect(() => decrypt(tampered)).toThrow(EncryptionError);
  });

  it("rejects an envelope with an unrecognized version tag", () => {
    const tampered = encrypt("versioned").replace(/^v1\./, "v2.");
    expect(() => decrypt(tampered)).toThrow(EncryptionError);
  });

  it("rejects a malformed envelope shape", () => {
    expect(() => decrypt("not-a-real-envelope")).toThrow(EncryptionError);
    expect(() => decrypt("v1.only.three.parts.here")).toThrow(EncryptionError);
    expect(() => decrypt("")).toThrow(EncryptionError);
  });

  it("derives a usable AES key from a 64-byte master secret", () => {
    process.env.ENCRYPTION_KEY = randomBytes(64).toString("base64");
    expect(decrypt(encrypt("64-byte-key-path"))).toBe("64-byte-key-path");
  });
});
