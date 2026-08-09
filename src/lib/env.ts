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

/** Auth.js v5 also accepts AUTH_SECRET / AUTH_URL; normalize both naming schemes. */
export function readAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export function readAuthUrl(): string | undefined {
  return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
}

export function readSessionMaxAge(): number {
  const expiry = optionalPositiveInteger.safeParse(process.env.NEXTAUTH_EXPIRY);
  return expiry.success && expiry.data !== undefined ? expiry.data : 60 * 60 * 24 * 30;
}

function readAuthEnvInput() {
  return {
    NEXTAUTH_SECRET: readAuthSecret(),
    NEXTAUTH_EXPIRY: process.env.NEXTAUTH_EXPIRY,
    NEXTAUTH_URL: readAuthUrl(),
  };
}

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
const appUrlEnvSchema = runtimeEnvSchema.pick({ NEXT_PUBLIC_APP_URL: true });
const cronEnvSchema = runtimeEnvSchema.pick({ CRON_SECRET: true });
const cloudinaryEnvSchema = runtimeEnvSchema.pick({
  CLOUDINARY_CLOUD_NAME: true,
  CLOUDINARY_API_KEY: true,
  CLOUDINARY_API_SECRET: true,
});

/**
 * `next build`'s "Collecting page data" step statically imports every route
 * module (including ones that only transitively reach `src/auth.ts`) purely
 * to inspect its exports — no request is ever served during this phase. On
 * platforms that don't expose runtime secrets to the build step, that eager
 * import would otherwise crash the build before a single page is rendered.
 * Next.js itself sets this env var during that phase (see
 * `node_modules/next/dist/build/index.js`), so detecting it and returning
 * unvalidated placeholders here is safe: the real values are re-read (and
 * still fully validated) the next time this runs, which is at request time
 * in the actual running server.
 */
const BUILD_PHASE_AUTH_ENV = { NEXTAUTH_SECRET: "0".repeat(32), NEXTAUTH_EXPIRY: undefined, NEXTAUTH_URL: "http://localhost:3000" };

export function getAuthEnv() {
  if (process.env.NEXT_PHASE === "phase-production-build") return BUILD_PHASE_AUTH_ENV;
  return authEnvSchema.parse(readAuthEnvInput());
}

export function getDatabaseEnv() {
  return databaseEnvSchema.parse({ DATABASE_URL: process.env.DATABASE_URL });
}

export function getEncryptionEnv() {
  return encryptionEnvSchema.parse({ ENCRYPTION_KEY: process.env.ENCRYPTION_KEY });
}

export function getAppUrlEnv() {
  return appUrlEnvSchema.parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL });
}

export function getCronEnv() {
  return cronEnvSchema.parse({ CRON_SECRET: process.env.CRON_SECRET });
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
    NEXTAUTH_SECRET: readAuthSecret(),
    NEXTAUTH_EXPIRY: process.env.NEXTAUTH_EXPIRY,
    NEXTAUTH_URL: readAuthUrl(),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });
}
