#!/usr/bin/env bun
/**
 * RFC 8032 Ed25519 verify. Args: pubHex sigHex msgHex
 * Uses Node/Bun crypto (same curve as @noble/ed25519 / nacl).
 */
import { verify } from "node:crypto";

const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function hex(s) {
  const h = s.trim().replace(/^0x/i, "");
  if (h.length % 2 !== 0) throw new Error("odd hex length");
  return Buffer.from(h, "hex");
}

function verifyRfc(pub, msg, sig) {
  if (pub.length !== 32) throw new Error(`pub ${pub.length} bytes, want 32`);
  if (sig.length !== 64) throw new Error(`sig ${sig.length} bytes, want 64`);
  const key = Buffer.concat([SPKI_PREFIX, pub]);
  return verify(undefined, msg, { key, format: "der", type: "spki" }, sig);
}

const pub = hex(process.argv[2] ?? "");
const sig = hex(process.argv[3] ?? "");
const msg = hex(process.argv[4] ?? "");
if (pub.length === 0 || sig.length === 0) {
  console.error("usage: bun card/verify.mjs <pubHex> <sigHex> <msgHex>");
  process.exit(2);
}

const ok = verifyRfc(pub, msg, sig);
console.log(ok ? "ok" : "fail");
process.exit(ok ? 0 : 1);
