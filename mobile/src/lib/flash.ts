let pending: string | undefined;

export function setFlash(text: string) {
  pending = text;
}

export function takeFlash(): string | undefined {
  const text = pending;
  pending = undefined;
  return text;
}
