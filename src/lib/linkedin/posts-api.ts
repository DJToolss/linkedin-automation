import "server-only";

import { LINKEDIN_REST_BASE_URL, linkedinApiHeaders } from "@/lib/linkedin/config";
import { LinkedInPublishError, classifyStatus } from "@/lib/linkedin/publish-error";

export type CreatePostInput = { authorUrn: string; commentary: string; imageUrn?: string };

/**
 * LinkedIn Posts API (implementation.MD correction #1). Verify this request
 * shape against the live API in Phase 0 before production use.
 */
export async function createLinkedInPost(accessToken: string, input: CreatePostInput): Promise<string> {
  const body: Record<string, unknown> = {
    author: input.authorUrn,
    commentary: input.commentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (input.imageUrn) body.content = { media: { id: input.imageUrn } };

  const response = await fetch(`${LINKEDIN_REST_BASE_URL}/posts`, {
    method: "POST",
    headers: linkedinApiHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new LinkedInPublishError(classifyStatus(response.status), `Post creation failed with status ${response.status}.`);
  }

  // Store the returned identifier only after a successful response, and
  // treat a missing one as a shape mismatch rather than assuming success
  // (implementation.MD Phase 5 item 3).
  const postUrn = response.headers.get("x-restli-id");
  if (!postUrn) throw new LinkedInPublishError("permanent", "LinkedIn did not return a post identifier.");
  return postUrn;
}
