"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { removeLinkedInAppCredentials, saveLinkedInAppCredentials } from "@/lib/linkedin/app-credentials";
import { disconnectConnection } from "@/lib/linkedin/connection";

const appCredentialsSchema = z.object({
  clientId: z.string().trim().min(1, "Enter the Client ID.").max(200, "Client ID is too long."),
  clientSecret: z.string().trim().min(1, "Enter the Client Secret.").max(500, "Client Secret is too long."),
});

export type SettingsFormState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function saveLinkedInAppAction(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const userId = await requireAuthenticatedUserId();
  const parsed = appCredentialsSchema.safeParse({
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await saveLinkedInAppCredentials(userId, parsed.data.clientId, parsed.data.clientSecret);
  revalidatePath("/settings");
  return {};
}

/**
 * Removing the app's credentials also disconnects first, so future
 * scheduled posts are reconciled to `requires_reconnect` before the
 * `linkedin_apps` row's cascade silently drops the connection.
 */
export async function removeLinkedInAppAction(): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  await disconnectConnection(userId);
  await removeLinkedInAppCredentials(userId);
  revalidatePath("/settings");
}

export async function disconnectLinkedInAction(): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  await disconnectConnection(userId);
  revalidatePath("/settings");
}
