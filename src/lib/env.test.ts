import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getAppUrlEnv, getAuthEnv, getCronEnv, getDatabaseEnv, getEncryptionEnv, getEnv } from "@/lib/env";

const VALID: Record<string, string> = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  NEXTAUTH_SECRET: "a".repeat(32),
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  CRON_SECRET: "b".repeat(16),
  CLOUDINARY_CLOUD_NAME: "demo",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
};

function resetEnv() {
  for (const key of Object.keys(VALID)) delete process.env[key];
  delete process.env.NEXTAUTH_EXPIRY;
}

beforeEach(() => {
  resetEnv();
  for (const [key, value] of Object.entries(VALID)) process.env[key] = value;
});
afterEach(resetEnv);

describe("env", () => {
  it("parses a fully valid environment", () => {
    expect(() => getEnv()).not.toThrow();
  });

  it("rejects a missing required variable and never echoes any variable's value", () => {
    delete process.env.DATABASE_URL;
    try {
      getEnv();
      expect.unreachable("expected getEnv() to throw");
    } catch (error) {
      const message = String(error);
      expect(message).toContain("DATABASE_URL");
      for (const value of Object.values(VALID)) {
        if (value.length > 8) expect(message).not.toContain(value);
      }
    }
  });

  it.each([32, 64])("accepts a base64 ENCRYPTION_KEY of %d random bytes", (byteLength) => {
    process.env.ENCRYPTION_KEY = randomBytes(byteLength).toString("base64");
    expect(() => getEncryptionEnv()).not.toThrow();
  });

  it.each([16, 24, 48])("rejects a base64 ENCRYPTION_KEY of %d bytes", (byteLength) => {
    process.env.ENCRYPTION_KEY = randomBytes(byteLength).toString("base64");
    expect(() => getEncryptionEnv()).toThrow();
  });

  it("rejects a non-base64 ENCRYPTION_KEY", () => {
    process.env.ENCRYPTION_KEY = "not base64 at all!!";
    expect(() => getEncryptionEnv()).toThrow();
  });

  it("parses a duration string for NEXTAUTH_EXPIRY", () => {
    process.env.NEXTAUTH_EXPIRY = "30d";
    expect(getAuthEnv().NEXTAUTH_EXPIRY).toBe(30 * 24 * 60 * 60);
  });

  it("leaves NEXTAUTH_EXPIRY undefined when unset", () => {
    expect(getAuthEnv().NEXTAUTH_EXPIRY).toBeUndefined();
  });

  it("rejects a NEXTAUTH_SECRET shorter than 32 characters", () => {
    process.env.NEXTAUTH_SECRET = "short";
    expect(() => getAuthEnv()).toThrow();
  });

  it("lets a scoped getter succeed even when unrelated variables are missing", () => {
    delete process.env.CLOUDINARY_API_KEY;
    expect(() => getDatabaseEnv()).not.toThrow();
  });

  it("rejects a non-URL NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
    expect(() => getAppUrlEnv()).toThrow();
  });

  it("rejects a CRON_SECRET shorter than 16 characters", () => {
    process.env.CRON_SECRET = "short";
    expect(() => getCronEnv()).toThrow();
  });
});
