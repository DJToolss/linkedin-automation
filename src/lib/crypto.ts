import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { getEncryptionEnv } from "@/lib/env";

const ENVELOPE_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export class EncryptionError extends Error {
  constructor(message = "Encrypted data is invalid or cannot be decrypted.") {
    super(message);
    this.name = "EncryptionError";
  }
}

function getAesKey(): Buffer {
  const masterKey = Buffer.from(getEncryptionEnv().ENCRYPTION_KEY, "base64");

  if (masterKey.length === 32) return masterKey;

  // A 64-byte value is a secure master secret, but not an AES-256 key. Derive
  // one deterministically so existing 64-byte keys can be used safely.
  return createHash("sha256")
    .update("linkedin-automation:aes-256-gcm:v1\0", "utf8")
    .update(masterKey)
    .digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getAesKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decrypt(envelope: string): string {
  const parts = envelope.split(".");
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new EncryptionError();
  }

  const [, ivEncoded, authTagEncoded, ciphertextEncoded] = parts;
  const iv = Buffer.from(ivEncoded, "base64");
  const authTag = Buffer.from(authTagEncoded, "base64");
  const ciphertext = Buffer.from(ciphertextEncoded, "base64");

  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES || ciphertext.length === 0) {
    throw new EncryptionError();
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", getAesKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new EncryptionError();
  }
}
