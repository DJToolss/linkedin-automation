import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { sql } from "drizzle-orm";

import * as schema from "@/lib/db/schema";
import { users } from "@/lib/db/schema";

/**
 * Integration-test database helpers. These require a real, disposable
 * Postgres database — a Neon branch or throwaway local instance, never the
 * application's actual dev/prod database. Point `TEST_DATABASE_URL` at it to
 * run the `*.integration.test.ts` suites; without it, they skip themselves
 * (see `describe.skipIf` in each file) rather than failing or, worse, ever
 * falling back to writing into an unconfigured or production connection.
 */
export function hasTestDatabase(): boolean {
  return Boolean(process.env.TEST_DATABASE_URL);
}

export function getTestDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set.");
  return drizzle(neon(url), { schema });
}

let migratedOnce = false;

/** Applies the same migrations `npm run db:migrate` would, once per test run. */
export async function ensureMigrated(): Promise<void> {
  if (migratedOnce) return;
  await migrate(getTestDb(), { migrationsFolder: "./drizzle" });
  migratedOnce = true;
}

/** Clears every table between tests so cases can't see each other's rows. */
export async function resetTestDatabase(): Promise<void> {
  await getTestDb().execute(
    sql`truncate table users, linkedin_apps, linkedin_connections, oauth_states, posts, post_attempts restart identity cascade`,
  );
}

export async function createTestUser(email: string): Promise<string> {
  const [user] = await getTestDb().insert(users).values({ email, passwordHash: "test-hash" }).returning({ id: users.id });
  return user.id;
}
