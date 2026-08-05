import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth/session";

export const getCurrentUser = cache(async () => {
  const userId = await requireAuthenticatedUserId();
  const [user] = await getDb().select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
});
