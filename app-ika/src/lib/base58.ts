const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(bytes: Uint8Array): string {
  const alphabetMap = new Map<string, number>();
  for (let i = 0; i < ALPHABET.length; i++) alphabetMap.set(ALPHABET[i], i);

  const zeros = [];
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) zeros.push("1");

  let num = 0n;
  for (const byte of bytes) {
    num = num * 256n + BigInt(byte);
  }

  let result = "";
  while (num > 0n) {
    result = ALPHABET[Number(num % 58n)] + result;
    num = num / 58n;
  }

  return zeros.join("") + result;
}

export function decodeBase58(str: string): Uint8Array {
  const zeros = [];
  for (let i = 0; i < str.length && str[i] === "1"; i++) zeros.push(0);

  let num = 0n;
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    num = num * 58n + BigInt(idx);
  }

  const result: number[] = [...zeros];
  if (num > 0n) {
    const bytes: number[] = [];
    while (num > 0n) {
      bytes.unshift(Number(num % 256n));
      num = num / 256n;
    }
    result.push(...bytes);
  }

  return new Uint8Array(result);
}
