import type { NextConfig } from "next";

// A .env or platform variable of NODE_ENV=development overrides what `next build`
// sets internally and breaks /_global-error prerendering (Next.js #87719).
if (process.env.npm_lifecycle_event === "build") {
  Object.assign(process.env, { NODE_ENV: "production" });
}

const nextConfig: NextConfig = {
  // Railway/Vercel inject secrets at build time for the proxy bundle. Reading
  // them here keeps middleware from starting with undefined auth env values.
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

export default nextConfig;
