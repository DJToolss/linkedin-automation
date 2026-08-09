import { describe, expect, it } from "vitest";

import { linkedInPostUrl } from "@/lib/linkedin/post-url";

describe("linkedInPostUrl", () => {
  it("builds a feed update URL from a post URN", () => {
    expect(linkedInPostUrl("urn:li:share:7492051049390993408")).toBe(
      "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A7492051049390993408",
    );
  });
});
