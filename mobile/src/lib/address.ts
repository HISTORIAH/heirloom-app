export function shortAddress(address: string, take = 4): string {
  if (address.length < take * 2 + 2) return address;
  return `${address.slice(0, take)}…${address.slice(-take)}`;
}
