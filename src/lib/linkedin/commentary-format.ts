/**
 * LinkedIn posts are plain text in the API. Visual "bold" and "italic" are
 * simulated with Unicode mathematical alphanumeric symbols — the standard
 * workaround used by LinkedIn formatters.
 */

export type PostCommentaryParts = {
  heading?: string | null;
  subHeading?: string | null;
  description: string;
};

const BOLD_UPPER_BASE = 0x1d5d4;
const BOLD_LOWER_BASE = 0x1d5ee;
const BOLD_DIGIT_BASE = 0x1d7ec;
const ITALIC_UPPER_BASE = 0x1d608;
const ITALIC_LOWER_BASE = 0x1d622;

function mapAlphanumeric(text: string, upperBase: number, lowerBase: number, digitBase?: number): string {
  return [...text]
    .map((char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return char;
      if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(upperBase + (code - 0x41));
      if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(lowerBase + (code - 0x61));
      if (digitBase !== undefined && code >= 0x30 && code <= 0x39) return String.fromCodePoint(digitBase + (code - 0x30));
      return char;
    })
    .join("");
}

/** Sans-serif bold Unicode — reads as a heading on LinkedIn. */
export function toLinkedInBold(text: string): string {
  return mapAlphanumeric(text, BOLD_UPPER_BASE, BOLD_LOWER_BASE, BOLD_DIGIT_BASE);
}

/** Sans-serif italic Unicode — reads as a subheading on LinkedIn. */
export function toLinkedInItalic(text: string): string {
  return mapAlphanumeric(text, ITALIC_UPPER_BASE, ITALIC_LOWER_BASE);
}

export function composeLinkedInCommentary(parts: PostCommentaryParts): string {
  const blocks: string[] = [];
  const heading = parts.heading?.trim();
  const subHeading = parts.subHeading?.trim();
  const description = parts.description.trim();

  if (heading) blocks.push(toLinkedInBold(heading));
  if (subHeading) blocks.push(toLinkedInItalic(subHeading));
  if (description) blocks.push(description);

  return blocks.join("\n\n");
}

export function hasPostBody(parts: PostCommentaryParts): boolean {
  return Boolean(parts.heading?.trim() || parts.subHeading?.trim() || parts.description.trim());
}

/** One-line preview for post lists. */
export function postListPreview(parts: PostCommentaryParts): string {
  return parts.heading?.trim() || parts.subHeading?.trim() || parts.description.trim();
}
