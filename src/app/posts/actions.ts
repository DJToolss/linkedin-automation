"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAuthenticatedUserId } from "@/lib/auth/session";
import { deletePostImage, duplicatePostImage, uploadPostImage } from "@/lib/cloudinary";
import { composeLinkedInCommentary, hasPostBody } from "@/lib/linkedin/commentary-format";
import { getConnectionSummary } from "@/lib/linkedin/connection";
import { validateImageBuffer } from "@/lib/media/image-signature";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_HEADING_LENGTH,
  MAX_POST_CONTENT_LENGTH,
  MAX_SUBHEADING_LENGTH,
} from "@/lib/posts/constants";
import {
  createPost,
  deletePendingPost,
  duplicatePostedPost,
  getEditablePostForUser,
  getPostedPostForUser,
  markEditablePostForImmediatePublish,
  updatePendingPost,
} from "@/lib/posts/posts";
import { runPublishBatchForPost } from "@/lib/publish/publisher";
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
    intent: z.preprocess((value) => (value === "post_now" ? "post_now" : "schedule"), z.enum(["schedule", "post_now"])),
    scheduledAt: z.preprocess(emptyToNull, z.string().nullable()),
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

    if (data.intent === "schedule" && !data.scheduledAt) {
      ctx.addIssue({ code: "custom", message: "Choose a date and time.", path: ["scheduledAt"] });
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
    intent: formData.get("intent"),
    scheduledAt: formData.get("scheduledAt"),
    timezone: formData.get("timezone"),
    removeImage: formData.get("removeImage"),
  });
}

function resolveScheduledAtUtc(parsed: z.infer<typeof postSchema>): { ok: true; scheduledAtUtc: Date } | { ok: false; fieldErrors: Record<string, string[]> } {
  if (parsed.intent === "post_now") return { ok: true, scheduledAtUtc: new Date() };

  const scheduledAtUtc = zonedTimeToUtc(parsed.scheduledAt ?? "", parsed.timezone);
  if (Number.isNaN(scheduledAtUtc.getTime())) return { ok: false, fieldErrors: { scheduledAt: ["Enter a valid date and time."] } };
  if (scheduledAtUtc <= new Date()) return { ok: false, fieldErrors: { scheduledAt: ["Choose a time in the future."] } };
  return { ok: true, scheduledAtUtc };
}

async function requireLinkedInForImmediatePublish(userId: string): Promise<PostFormState | null> {
  const connection = await getConnectionSummary(userId);
  if (connection?.status === "connected") return null;
  return { error: "Connect LinkedIn in Settings before posting now." };
}

async function publishImmediatelyAndRedirect(postId: string, successPath: string, failurePath: string = "/posts"): Promise<void> {
  cancelScheduledPublish(postId);
  const summary = await runPublishBatchForPost(postId);
  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  if (summary.succeeded) redirect(successPath);
  if (summary.claimed === 0) schedulePostPublish(postId, new Date());
  redirect(failurePath);
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

  const postNow = parsed.data.intent === "post_now";
  if (postNow) {
    const connectionError = await requireLinkedInForImmediatePublish(userId);
    if (connectionError) return connectionError;
  }

  const schedule = resolveScheduledAtUtc(parsed.data);
  if (!schedule.ok) return { fieldErrors: schedule.fieldErrors };

  const image = await readImageFile(formData);
  if (image.kind === "error") return { fieldErrors: { image: [image.message] } };
  const uploaded = image.kind === "ok" ? await uploadPostImage(userId, image.buffer, image.mime) : null;

  const created = await createPost(userId, {
    ...toPostInput(parsed.data, schedule.scheduledAtUtc),
    imageUrl: uploaded?.url ?? null,
    imagePublicId: uploaded?.publicId ?? null,
  });
  if (!created) {
    if (uploaded) await deletePostImage(uploaded.publicId);
    return { error: postNow ? "Could not publish the post. Please try again." : "Could not schedule the post. Please try again." };
  }

  if (postNow) {
    await publishImmediatelyAndRedirect(created.id, `/posts/${created.id}`);
    return {};
  }

  schedulePostPublish(created.id, schedule.scheduledAtUtc);

  revalidatePath("/posts");
  redirect("/posts");
}

export async function reschedulePostedPostAction(sourcePostId: string, _: PostFormState, formData: FormData): Promise<PostFormState> {
  const userId = await requireAuthenticatedUserId();

  const source = await getPostedPostForUser(userId, sourcePostId);
  if (!source) return { error: "This post can no longer be rescheduled." };

  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const postNow = parsed.data.intent === "post_now";
  if (postNow) {
    const connectionError = await requireLinkedInForImmediatePublish(userId);
    if (connectionError) return connectionError;
  }

  const schedule = resolveScheduledAtUtc(parsed.data);
  if (!schedule.ok) return { fieldErrors: schedule.fieldErrors };

  const image = await readImageFile(formData);
  if (image.kind === "error") return { fieldErrors: { image: [image.message] } };
  const uploaded = image.kind === "ok" ? await uploadPostImage(userId, image.buffer, image.mime) : null;
  const removingImage = parsed.data.removeImage === "on";

  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;
  if (uploaded) {
    imageUrl = uploaded.url;
    imagePublicId = uploaded.publicId;
  } else if (!removingImage && source.imageUrl) {
    const copied = await duplicatePostImage(userId, source.imageUrl);
    if (copied) {
      imageUrl = copied.url;
      imagePublicId = copied.publicId;
    } else {
      imageUrl = source.imageUrl;
    }
  }

  const created = await duplicatePostedPost(userId, sourcePostId, {
    ...toPostInput(parsed.data, schedule.scheduledAtUtc),
    imageUrl,
    imagePublicId,
  });
  if (!created) {
    if (imagePublicId) await deletePostImage(imagePublicId);
    return { error: "This post can no longer be rescheduled." };
  }

  if (postNow) {
    await publishImmediatelyAndRedirect(created.id, `/posts/${created.id}`);
    return {};
  }

  schedulePostPublish(created.id, schedule.scheduledAtUtc);

  revalidatePath("/posts");
  revalidatePath(`/posts/${sourcePostId}`);
  redirect("/posts");
}

export async function updatePostAction(postId: string, _: PostFormState, formData: FormData): Promise<PostFormState> {
  const userId = await requireAuthenticatedUserId();

  const existing = await getEditablePostForUser(userId, postId);
  if (!existing) return { error: "This post can no longer be edited." };

  const parsed = parsePostForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const postNow = parsed.data.intent === "post_now";
  if (postNow) {
    const connectionError = await requireLinkedInForImmediatePublish(userId);
    if (connectionError) return connectionError;
  }

  const schedule = resolveScheduledAtUtc(parsed.data);
  if (!schedule.ok) return { fieldErrors: schedule.fieldErrors };

  const image = await readImageFile(formData);
  if (image.kind === "error") return { fieldErrors: { image: [image.message] } };
  const uploaded = image.kind === "ok" ? await uploadPostImage(userId, image.buffer, image.mime) : null;

  const removingImage = parsed.data.removeImage === "on";
  const nextImageUrl = uploaded ? uploaded.url : removingImage ? null : existing.imageUrl;
  const nextImagePublicId = uploaded ? uploaded.publicId : removingImage ? null : existing.imagePublicId;

  const updated = await updatePendingPost(userId, postId, {
    ...toPostInput(parsed.data, schedule.scheduledAtUtc),
    imageUrl: nextImageUrl,
    imagePublicId: nextImagePublicId,
  });
  if (!updated) {
    if (uploaded) await deletePostImage(uploaded.publicId);
    return { error: "This post can no longer be edited." };
  }

  if (existing.imagePublicId && existing.imagePublicId !== nextImagePublicId) {
    await deletePostImage(existing.imagePublicId);
  }

  if (postNow) {
    await publishImmediatelyAndRedirect(postId, `/posts/${postId}`);
    return {};
  }

  schedulePostPublish(postId, schedule.scheduledAtUtc);

  revalidatePath("/posts");
  redirect("/posts");
}

export async function publishNowAction(postId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  const existing = await getEditablePostForUser(userId, postId);
  if (!existing) return;

  const marked = await markEditablePostForImmediatePublish(userId, postId);
  if (!marked) return;

  await publishImmediatelyAndRedirect(postId, "/posts?tab=posted");
}

export async function deletePostAction(postId: string): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  cancelScheduledPublish(postId);
  const deleted = await deletePendingPost(userId, postId);
  if (deleted?.imagePublicId) await deletePostImage(deleted.imagePublicId);
  revalidatePath("/posts");
}
