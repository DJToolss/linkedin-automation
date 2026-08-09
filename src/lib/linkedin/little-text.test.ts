import { describe, expect, it } from "vitest";

import { escapeLittleTextCommentary } from "@/lib/linkedin/little-text";

describe("escapeLittleTextCommentary", () => {
  it("passes plain text through unchanged", () => {
    expect(escapeLittleTextCommentary("Hello world")).toBe("Hello world");
  });

  it("escapes parentheses so LinkedIn does not truncate commentary", () => {
    expect(escapeLittleTextCommentary("Why System Design Matters (The Mindset Shift)")).toBe(
      "Why System Design Matters \\(The Mindset Shift\\)",
    );
  });

  it("escapes pipe characters", () => {
    expect(escapeLittleTextCommentary("Post 1 | Post 2")).toBe("Post 1 \\| Post 2");
  });

  it("escapes every little-format reserved character", () => {
    const reserved = '\\|{}@[]()<>#*_~';
    expect(escapeLittleTextCommentary(reserved)).toBe(
      "\\\\\\|\\{\\}\\@\\[\\]\\(\\)\\<\\>\\#\\*\\_\\~",
    );
  });

  it("escapes backslashes along with other reserved characters", () => {
    expect(escapeLittleTextCommentary(String.raw`path\to\file (v1)`)).toBe(String.raw`path\\to\\file \(v1\)`);
  });

  it("escapes the user's full regression caption", () => {
    const input =
      "Why System Design Matters (The Mindset Shift) Series: System Design from First Principles | Post 1 of 70 Most engineers learn to write correct code long before they learn to design systems that survive real users";
    const escaped = escapeLittleTextCommentary(input);

    expect(escaped).toContain("\\(The Mindset Shift\\)");
    expect(escaped).toContain("First Principles \\| Post 1 of 70");
    expect(escaped.length).toBeGreaterThan(input.length);
  });
});
