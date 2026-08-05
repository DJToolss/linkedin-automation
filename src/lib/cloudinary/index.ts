import "server-only";

import { randomUUID } from "node:crypto";

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

let configured = false;
function client() {
  if (!configured) {
    const env = getCloudinaryEnv();
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export type UploadedImage = { url: string; publicId: string };

/**
 * The public ID is server-generated and folder-scoped by the authenticated
 * user; the caller never supplies (and this never trusts) a client-provided
 * Cloudinary URL or public ID (implementation.MD Phase 4 item 3).
 */
export async function uploadPostImage(userId: string, buffer: Buffer, mime: string): Promise<UploadedImage> {
  const publicId = `users/${userId}/posts/${randomUUID()}`;
  const result = await client().uploader.upload(`data:${mime};base64,${buffer.toString("base64")}`, {
    public_id: publicId,
    resource_type: "image",
    type: "upload",
    overwrite: false,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Best-effort: a delete failure is logged, not thrown, so a Cloudinary
 * outage never blocks the user's create/update/delete request.
 */
export async function deletePostImage(publicId: string): Promise<void> {
  try {
    await client().uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    logger.error("Cloudinary delete failed", { publicId, error: error instanceof Error ? error.message : String(error) });
  }
}
