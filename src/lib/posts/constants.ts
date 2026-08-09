// No "server-only" guard: this constant is shared by both the server action
// (validation) and the client composer (maxLength/character count), so it
// must be safe to bundle into client code.

/** LinkedIn's documented member-post commentary limit; re-verify in Phase 0. */
export const MAX_POST_CONTENT_LENGTH = 3000;
export const MAX_HEADING_LENGTH = 220;
export const MAX_SUBHEADING_LENGTH = 300;
export const MAX_DESCRIPTION_LENGTH = 3000;
export const POSTS_PAGE_SIZE = 10;
