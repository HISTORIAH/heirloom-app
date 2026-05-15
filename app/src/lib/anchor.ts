export function unwrapOption<T = string>(opt: unknown): T | null {
  if (opt && typeof opt === "object" && "__option" in opt) {
    const o = opt as { __option: "Some" | "None"; value?: T };
    return o.__option === "Some" && o.value !== undefined ? o.value : null;
  }
  return null;
}
