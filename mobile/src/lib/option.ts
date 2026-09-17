/** Codama Option<Address> is `{ __option, value }`. `String(option)` is `[object Object]`. */
export function unwrapOption(opt: unknown): string | null {
  if (opt == null) return null;
  if (typeof opt === "string") return opt || null;
  if (typeof opt === "object" && opt !== null && "__option" in opt) {
    const o = opt as { __option: string; value?: unknown };
    if (o.__option === "None") return null;
    return unwrapOption(o.value);
  }
  const s = String(opt);
  return s && s !== "[object Object]" ? s : null;
}
