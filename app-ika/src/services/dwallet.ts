import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bech32, bech32m } from "bech32";
import bs58 from "bs58";
import type { ChainId } from "@/types";

const COMPRESSED_PUBKEY_LEN = 33;

export function decompressSecp256k1(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length === 65) return publicKey;
  if (publicKey.length !== COMPRESSED_PUBKEY_LEN) {
    throw new Error(`Invalid secp256k1 pubkey length: ${publicKey.length}`);
  }
  return secp256k1.ProjectivePoint.fromHex(publicKey).toRawBytes(false);
}

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

function dsha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toEip55Checksum(address: string): string {
  const addr = address.toLowerCase().replace("0x", "");
  const addrBytes = new Uint8Array(addr.length);
  for (let i = 0; i < addr.length; i++) addrBytes[i] = addr.charCodeAt(i);
  const hash = bytesToHex(keccak_256(addrBytes));
  let checksum = "0x";
  for (let i = 0; i < addr.length; i++) {
    checksum += parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return checksum;
}

export function deriveEvmAddress(publicKey: Uint8Array): string {
  const uncompressed = decompressSecp256k1(publicKey);
  const hash = keccak_256(uncompressed.slice(1));
  return toEip55Checksum("0x" + bytesToHex(hash.slice(-20)));
}

export type BtcNetwork = "mainnet" | "testnet";
export type BtcFormat = "p2pkh" | "p2wpkh" | "p2tr";

const BTC_PREFIXES: Record<BtcNetwork, { p2pkh: number; p2wpkh: string; p2tr: string }> = {
  mainnet: { p2pkh: 0x00, p2wpkh: "bc", p2tr: "bc" },
  testnet: { p2pkh: 0x6f, p2wpkh: "tb", p2tr: "tb" },
};

function compressSecp256k1(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length === 33) return publicKey;
  return secp256k1.ProjectivePoint.fromHex(publicKey).toRawBytes(true);
}

export function deriveBtcP2pkhAddress(
  publicKey: Uint8Array,
  network: BtcNetwork = "mainnet",
): string {
  const compressed = compressSecp256k1(publicKey);
  const h160 = hash160(compressed);
  const payload = new Uint8Array(1 + h160.length);
  payload[0] = BTC_PREFIXES[network].p2pkh;
  payload.set(h160, 1);
  const checksum = dsha256(payload).slice(0, 4);
  const full = new Uint8Array(payload.length + checksum.length);
  full.set(payload);
  full.set(checksum, payload.length);
  return bs58.encode(full);
}

export function deriveBtcP2wpkhAddress(
  publicKey: Uint8Array,
  network: BtcNetwork = "mainnet",
): string {
  const compressed = compressSecp256k1(publicKey);
  const h160 = hash160(compressed);
  const words = bech32.toWords(Array.from(h160));
  return bech32.encode(BTC_PREFIXES[network].p2wpkh, [0, ...words]);
}

export function deriveBtcP2trAddress(
  publicKey: Uint8Array,
  network: BtcNetwork = "mainnet",
): string {
  const compressed = compressSecp256k1(publicKey);
  const xOnly = compressed.slice(1);
  const words = bech32.toWords(Array.from(xOnly));
  return bech32m.encode(BTC_PREFIXES[network].p2tr, [1, ...words]);
}

export function deriveAddress(
  publicKey: Uint8Array,
  chainId: ChainId,
  format: BtcFormat = "p2wpkh",
  network: BtcNetwork = "mainnet",
): string {
  if (chainId !== 2) return deriveEvmAddress(publicKey);
  if (format === "p2pkh") return deriveBtcP2pkhAddress(publicKey, network);
  if (format === "p2wpkh") return deriveBtcP2wpkhAddress(publicKey, network);
  if (format === "p2tr") return deriveBtcP2trAddress(publicKey, network);
  throw new Error(`Unknown BTC format: ${format}`);
}

export function encodeChainAddress(address: string): Uint8Array {
  if (address.startsWith("0x")) {
    const clean = address.slice(2);
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  return new TextEncoder().encode(address);
}
