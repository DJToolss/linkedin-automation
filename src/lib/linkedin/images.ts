import "server-only";

import { z } from "zod";

import { LINKEDIN_REST_BASE_URL, linkedinApiHeaders } from "@/lib/linkedin/config";
import { LinkedInPublishError, classifyStatus } from "@/lib/linkedin/publish-error";

const initializeUploadResponseSchema = z.object({
  value: z.object({ uploadUrl: z.string().min(1), image: z.string().min(1) }),
});

export type InitializedImageUpload = { uploadUrl: string; imageUrn: string };

/**
 * LinkedIn Images API (implementation.MD correction #1). This request/
 * response shape follows LinkedIn's published Images API docs but has not
 * been exercised against a live app — verify in Phase 0 before relying on
 * it in production; a shape mismatch fails loudly via schema validation
 * rather than silently corrupting a post.
 */
export async function initializeImageUpload(accessToken: string, ownerUrn: string): Promise<InitializedImageUpload> {
  const response = await fetch(`${LINKEDIN_REST_BASE_URL}/images?action=initializeUpload`, {
    method: "POST",
    headers: linkedinApiHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (!response.ok) {
    throw new LinkedInPublishError(classifyStatus(response.status), `Image initialization failed with status ${response.status}.`);
  }

  const parsed = initializeUploadResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new LinkedInPublishError("permanent", "Image initialization response did not match the expected shape.");
  return { uploadUrl: parsed.data.value.uploadUrl, imageUrn: parsed.data.value.image };
}

export async function uploadImageBytes(accessToken: string, uploadUrl: string, bytes: Buffer, contentType: string): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType },
    body: Uint8Array.from(bytes), // Node's Buffer type doesn't structurally satisfy fetch's BodyInit
  });
  if (!response.ok) {
    throw new LinkedInPublishError(classifyStatus(response.status), `Image upload failed with status ${response.status}.`);
  }
}

/** Fetches the previously-uploaded Cloudinary asset so its bytes can be handed to LinkedIn. */
export async function fetchPostImageBytes(imageUrl: string): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    // A transient Cloudinary/network blip is worth retrying; it is not the member's fault.
    throw new LinkedInPublishError("retryable", `Could not download the post image (status ${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
}
