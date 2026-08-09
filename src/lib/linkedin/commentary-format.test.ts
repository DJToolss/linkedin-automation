import { describe, expect, it } from "vitest";

import { composeLinkedInCommentary, toLinkedInBold, toLinkedInItalic } from "@/lib/linkedin/commentary-format";

describe("toLinkedInBold", () => {
  it("maps ASCII letters and digits to sans-serif bold Unicode", () => {
    expect(toLinkedInBold("Hello 2026")).toBe("𝗛𝗲𝗹𝗹𝗼 𝟮𝟬𝟮𝟲");
  });

  it("bolds letters and digits inside parentheses", () => {
    expect(toLinkedInBold("(Part 1)")).toBe("(𝗣𝗮𝗿𝘁 𝟭)");
  });
});

describe("toLinkedInItalic", () => {
  it("maps ASCII letters to sans-serif italic Unicode", () => {
    expect(toLinkedInItalic("Series intro")).toBe("𝘚𝘦𝘳𝘪𝘦𝘴 𝘪𝘯𝘵𝘳𝘰");
  });
});

describe("composeLinkedInCommentary", () => {
  it("combines heading, subheading, and description with blank lines", () => {
    const composed = composeLinkedInCommentary({
      heading: "Main Title",
      subHeading: "Sub title",
      description: "Body text here.",
    });

    expect(composed).toBe("𝗠𝗮𝗶𝗻 𝗧𝗶𝘁𝗹𝗲\n\n𝘚𝘶𝘣 𝘵𝘪𝘵𝘭𝘦\n\nBody text here.");
  });

  it("supports description-only posts for backward compatibility", () => {
    expect(composeLinkedInCommentary({ heading: null, subHeading: null, description: "Plain post" })).toBe("Plain post");
  });
});
