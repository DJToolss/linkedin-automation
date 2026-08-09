"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { deletePostImage, uploadPostImage } from "@/lib/cloudinary";
import { composeLinkedInCommentary, hasPostBody } from "@/lib/linkedin/commentary-format";
import { validateImageBuffer } from "@/lib/media/image-signature";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_HEADING_LENGTH,
  MAX_POST_CONTENT_LENGTH,
  MAX_SUBHEADING_LENGTH,
} from "@/lib/posts/constants";
import { createPost, deletePendingPost, getEditablePostForUser, updatePendingPost } from "@/lib/posts/posts";
import { cancelScheduledPublish, schedulePostPublish } from "@/lib/publish/scheduler";
import { isValidIanaTimeZone, zonedTimeToUtc } from "@/lib/time/timezone";

export type PostFormState = { error?: string; fieldErrors?: Record<string, string[]> };

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const postSchema = z
  .object({
    heading: z.preprocess(emptyToNull, z.string().max(MAX_HEADING_LENGTH, `Keep the heading under ${MAX_HEADING_LENGTH} characters.`).nullable()),
    subHeading: z.preprocess(
      emptyToNull,
      z.string().max(MAX_SUBHEADING_LENGTH, `Keep the subheading under ${MAX_SUBHEADING_LENGTH} characters.`).nullable(),
    ),
    content: z.preprocess(
      emptyToNull,
      z.string().max(MAX_DESCRIPTION_LENGTH, `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`).nullable(),
    ),
    scheduledAt: z.string().min(1, "Choose a date and time."),
    timezone: z.string().min(1, "Choose a time zone.").refine(isValidIanaTimeZone, "Choose a valid time zone."),
    removeImage: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!hasPostBody({ heading: data.heading, subHeading: data.subHeading, description: data.content ?? "" })) {
      ctx.addIssue({ code: "custom", message: "Add a heading, subheading, or description.", path: ["content"] });
    }

    const composedLength = composeLinkedInCommentary({
      heading: data.heading,
      subHeading: data.subHeading,
      description: data.content ?? "",
    }).length;

    if (composedLength > MAX_POST_CONTENT_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `The combined LinkedIn post is too long (${composedLength}/${MAX_POST_CONTENT_LENGTH} characters after formatting).`,
        path: ["content"],
      });
    }
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
    heading: formData.get("heading"),
    subHeading: formData.get("subHeading"),
    content: formData.get("content"),
    scheduledAt: formData.get("scheduledAt"),
    timezone: formData.get("timezone"),
    removeImage: formData.get("removeImage"),
  });
}

function toPostInput(parsed: z.infer<typeof postSchema>, scheduledAtUtc: Date) {
  return {
    heading: parsed.heading,
    subHeading: parsed.subHeading,
    content: parsed.content ?? "",
    scheduledAt: scheduledAtUtc,
    timezone: parsed.timezone,
  };
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
    ...toPostInput(parsed.data, scheduledAtUtc),
    imageUrl: uploaded?.url ?? null,
    imagePublicId: uploaded?.publicId ?? null,
  });
  if (!created) {
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
    ...toPostInput(parsed.data, scheduledAtUtc),
    imageUrl: nextImageUrl,
    imagePublicId: nextImagePublicId,
  });
  if (!updated) {
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
