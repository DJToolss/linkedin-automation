import { describe, expect, it } from "vitest";

import { pgPoolSsl, resolveDatabaseConnectionString } from "@/lib/db/connection-string";

describe("resolveDatabaseConnectionString", () => {
  it("prefers DATABASE_URL when set", () => {
    const url = resolveDatabaseConnectionString({
      DATABASE_URL: "postgresql://u:p@neon.example.com/neondb?sslmode=require",
      POSTGRES_USER: "ignored",
    });
    expect(url).toContain("neon.example.com");
  });

  it("builds a URL from POSTGRES_* parts", () => {
    const url = resolveDatabaseConnectionString({
      POSTGRES_USER: "linkedin",
      POSTGRES_PASSWORD: "secret",
      POSTGRES_DB: "linkedin",
      DATABASE_HOST: "postgres",
      DATABASE_PORT: "5432",
    });
    expect(url).toBe("postgresql://linkedin:secret@postgres:5432/linkedin?sslmode=disable");
  });

  it("adds sslmode when DATABASE_SSL is true", () => {
    const url = resolveDatabaseConnectionString({
      POSTGRES_USER: "u",
      POSTGRES_PASSWORD: "p",
      POSTGRES_DB: "d",
      DATABASE_SSL: "true",
    });
    expect(url).toContain("sslmode=require");
  });
});

describe("pgPoolSsl", () => {
  it("disables ssl for local docker URLs", () => {
    expect(pgPoolSsl("postgresql://u:p@postgres:5432/db", { DATABASE_SSL: "false" })).toBe(false);
  });

  it("enables ssl when sslmode=require is in the URL", () => {
    expect(pgPoolSsl("postgresql://u:p@host/db?sslmode=require", {})).toEqual({ rejectUnauthorized: true });
  });
});
