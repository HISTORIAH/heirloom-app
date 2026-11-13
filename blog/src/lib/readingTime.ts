/** Average adult reading speed for technical prose, in words per minute. */
const WORDS_PER_MINUTE = 225;

/**
 * Minutes to read a post's raw MDX body, rounded up, never less than one.
 * Code blocks and markup count as words too, which errs on the long side for
 * engineering posts; that is closer to how long they actually take.
 */
export function readingTime(body: string | undefined): number {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
