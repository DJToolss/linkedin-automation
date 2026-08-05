import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const getAuthenticatedUserId = cache(async (): Promise<string | null> => (await auth())?.user?.id ?? null);
export const requireAuthenticatedUserId = cache(async (): Promise<string> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/login");
  return userId;
});
