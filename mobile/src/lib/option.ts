/** Codama Option<Address> is `{ __option, value }`. `String(option)` is `[object Object]`. */
export function unwrapOption(opt: unknown): string | null {
  if (opt === undefined || opt === null) return null;
  if (typeof opt === "string") return opt || null;
  if (typeof opt !== "object") return null;
  if ("__option" in opt) {
    const o = opt as { __option: string; value?: unknown };
    if (o.__option !== "Some") return null;
    return unwrapOption(o.value);
  }
  const s = String(opt);
  return s && s !== "[object Object]" ? s : null;
}
