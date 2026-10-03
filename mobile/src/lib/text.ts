/** "1 day", "3 days". Pass `bare` for the word alone. */
export function plural(n: number, word: string, bare = false): string {
  const w = n === 1 ? word : `${word}s`;
  return bare ? w : `${n} ${w}`;
}

/** Message of anything thrown, or a fallback sentence. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.length > 0 ? cause.message : fallback;
}

/** The wallet or the NFC sheet was dismissed, not a real failure. */
export function isUserCancel(cause: unknown): boolean {
  const raw = cause instanceof Error ? cause.message : String(cause ?? "");
  return /user (reject|denied|cancel)|reject(ed)? the request|cancel+ed( the request)?|UserCancel|interrupted/i.test(raw);
}
