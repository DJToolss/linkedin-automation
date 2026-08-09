"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { deletePostImage, uploadPostImage } from "@/lib/cloudinary";
import { validateImageBuffer } from "@/lib/media/image-signature";
import { MAX_POST_CONTENT_LENGTH } from "@/lib/posts/constants";
import { createPost, deletePendingPost, getEditablePostForUser, updatePendingPost } from "@/lib/posts/posts";
import { cancelScheduledPublish, schedulePostPublish } from "@/lib/publish/scheduler";
import { isValidIanaTimeZone, zonedTimeToUtc } from "@/lib/time/timezone";

export type PostFormState = { error?: string; fieldErrors?: Record<string, string[]> };

const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something to post.")
    .max(MAX_POST_CONTENT_LENGTH, `Keep posts under ${MAX_POST_CONTENT_LENGTH} characters.`),
  scheduledAt: z.string().min(1, "Choose a date and time."),
  timezone: z.string().min(1, "Choose a time zone.").refine(isValidIanaTimeZone, "Choose a valid time zone."),
  removeImage: z.string().nullable().optional(),
});

type ImageReadResult = { kind: "none" } | { kind: "error"; message: string } | { kind: "ok"; buffer: Buffer; mime: string };

async function readImageFile(formData: FormData): Promise<ImageReadResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { kind: "none" };
  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = validateImageBuffer(buffer);
  if (!validated.ok) return { kind: "error", message: validated.reason };
  return { kind: "ok", buffer, mime: validated.sniffed.mime };
}

function parsePostForm(formData: FormData) {
  return postSchema.safeParse({
    content: formData.get("content"),
    scheduledAt: formData.get("scheduledAt"),
    timezone: formData.get("timezone"),
    removeImage: formData.get("removeImage"),
  });
}

export async function createPostAction(_: PostFormState, formData: FormData): Promise<PostFormState> {
  const userId = await requireAuthenticatedUserId();

  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const scheduledAtUtc = zonedTimeToUtc(parsed.data.scheduledAt, parsed.data.timezone);
  if (Number.isNaN(scheduledAtUtc.getTime())) return { fieldErrors: { scheduledAt: ["Enter a valid date and time."] } };
  if (scheduledAtUtc <= new Date()) return { fieldErrors: { scheduledAt: ["Choose a time in the future."] } };

  const image = await readImageFile(formData);
  if (image.kind === "error") return { fieldErrors: { image: [image.message] } };
  const uploaded = image.kind === "ok" ? await uploadPostImage(userId, image.buffer, image.mime) : null;

  const created = await createPost(userId, {
    content: parsed.data.content,
    scheduledAt: scheduledAtUtc,
    timezone: parsed.data.timezone,
    imageUrl: uploaded?.url ?? null,
    imagePublicId: uploaded?.publicId ?? null,
  });
  if (!created) {
    // The upload (if any) succeeded but the row was never created; the
    // asset is left in place for diagnosis rather than guessed at (Phase 4
    // item 4) — it is unreferenced, not silently lost.
    return { error: "Could not schedule the post. Please try again." };
  }

  schedulePostPublish(created.id, scheduledAtUtc);

  revalidatePath("/posts");
  redirect("/posts");
}

export async function updatePostAction(postId: string, _: PostFormState, formData: FormData): Promise<PostFormState> {
  const userId = await requireAuthenticatedUserId();

  const existing = await getEditablePostForUser(userId, postId);
  if (!existing) return { error: "This post can no longer be edited." };

  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const scheduledAtUtc = zonedTimeToUtc(parsed.data.scheduledAt, parsed.data.timezone);
  if (Number.isNaN(scheduledAtUtc.getTime())) return { fieldErrors: { scheduledAt: ["Enter a valid date and time."] } };
  if (scheduledAtUtc <= new Date()) return { fieldErrors: { scheduledAt: ["Choose a time in the future."] } };

  const image = await readImageFile(formData);
  if (image.kind === "error") return { fieldErrors: { image: [image.message] } };
  const uploaded = image.kind === "ok" ? await uploadPostImage(userId, image.buffer, image.mime) : null;

  const removingImage = parsed.data.removeImage === "on";
  const nextImageUrl = uploaded ? uploaded.url : removingImage ? null : existing.imageUrl;
  const nextImagePublicId = uploaded ? uploaded.publicId : removingImage ? null : existing.imagePublicId;

  const updated = await updatePendingPost(userId, postId, {
    content: parsed.data.content,
    scheduledAt: scheduledAtUtc,
    timezone: parsed.data.timezone,
    imageUrl: nextImageUrl,
    imagePublicId: nextImagePublicId,
  });
  if (!updated) {
    // The ownership/status re-check inside updatePendingPost failed (the
    // post was deleted, published, or otherwise changed concurrently).
    // Don't leave a freshly-uploaded, now-unreferenced asset behind.
    if (uploaded) await deletePostImage(uploaded.publicId);
    return { error: "This post can no longer be edited." };
  }

  schedulePostPublish(postId, scheduledAtUtc);

  if (existing.imagePublicId && existing.imagePublicId !== nextImagePublicId) {
    await deletePostImage(existing.imagePublicId);
  }

  revalidatePath("/posts");
  redirect("/posts");
}

export async function deletePostAction(postId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  cancelScheduledPublish(postId);
  const deleted = await deletePendingPost(userId, postId);
  if (deleted?.imagePublicId) await deletePostImage(deleted.imagePublicId);
  revalidatePath("/posts");
}
