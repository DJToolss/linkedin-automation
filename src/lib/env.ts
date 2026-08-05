import "server-only";

import { z } from "zod";

const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isSupportedEncryptionKey(value: string): boolean {
  if (!base64Pattern.test(value)) return false;

  const byteLength = Buffer.from(value, "base64").length;
  return byteLength === 32 || byteLength === 64;
}

const optionalPositiveInteger = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) return undefined;
    if (typeof value !== "string") return value;

    const duration = /^(\d+)([smhd])$/.exec(value.trim());
    if (!duration) return value;

    const multipliers = { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24 } as const;
    return Number(duration[1]) * multipliers[duration[2] as keyof typeof multipliers];
  },
  z.coerce.number().int().positive().optional(),
);

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_EXPIRY: optionalPositiveInteger,
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .refine(isSupportedEncryptionKey, "ENCRYPTION_KEY must be base64 for 32 or 64 random bytes."),
  CRON_SECRET: z.string().min(16),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

const authEnvSchema = runtimeEnvSchema.pick({
  NEXTAUTH_SECRET: true,
  NEXTAUTH_EXPIRY: true,
  NEXTAUTH_URL: true,
});
const databaseEnvSchema = runtimeEnvSchema.pick({ DATABASE_URL: true });
const encryptionEnvSchema = runtimeEnvSchema.pick({ ENCRYPTION_KEY: true });
const cloudinaryEnvSchema = runtimeEnvSchema.pick({
  CLOUDINARY_CLOUD_NAME: true,
  CLOUDINARY_API_KEY: true,
  CLOUDINARY_API_SECRET: true,
});

export function getAuthEnv() {
  return authEnvSchema.parse({
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_EXPIRY: process.env.NEXTAUTH_EXPIRY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });
}

export function getDatabaseEnv() {
  return databaseEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL });
}

export function getEncryptionEnv() {
  return encryptionEnvSchema.parse({ ENCRYPTION_KEY: process.env.ENCRYPTION_KEY });
}

export function getCloudinaryEnv() {
  return cloudinaryEnvSchema.parse({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Reads runtime configuration only when server-side functionality needs it.
 * Validation errors intentionally identify variable names but never values.
 */
export function getEnv(): RuntimeEnv {
  return runtimeEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_EXPIRY: process.env.NEXTAUTH_EXPIRY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });
}
