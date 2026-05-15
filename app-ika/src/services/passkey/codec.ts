import { p256 } from "@noble/curves/p256";
import { decode as cborDecode } from "cbor2";

// ── base64url ─────────────────────────────────────────────────────────────────
// @solana/kit's getBase64Codec uses the standard alphabet (btoa/atob), which is
// NOT URL-safe. WebAuthn requires base64url: "-" and "_" instead of "+" and "/",
// no "=" padding. There is no browser-native API for this, so these two helpers
// are the minimal required shim.

export function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function fromBase64Url(s: string): Uint8Array {
  const padded = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

// ── DER → raw r||s ────────────────────────────────────────────────────────────

export function derToRawSig(der: Uint8Array): Uint8Array {
  return p256.Signature.fromDER(der).toCompactRawBytes();
}

// ── P-256 key extraction ──────────────────────────────────────────────────────

/**
 * Parse an SPKI-encoded P-256 public key (returned by `getPublicKey()` on
 * modern browsers) and return the 33-byte compressed key as a hex string.
 *
 * P-256 SPKI always ends with: 0x04 <x:32> <y:32> (uncompressed EC point).
 * Scan for that marker and compress via noble/curves.
 */
export function spkiToCompressedHex(spki: Uint8Array): string {
  const pointStart = spki.lastIndexOf(0x04);
  if (pointStart === -1 || spki.length - pointStart !== 65) {
    throw new Error("SPKI: cannot locate 65-byte uncompressed EC point");
  }
  return buildCompressedHex(
    spki.slice(pointStart + 1, pointStart + 33),
    spki.slice(pointStart + 33, pointStart + 65)
  );
}

/**
 * Extract the compressed P-256 key from a WebAuthn attestationObject when
 * `getPublicKey()` is unavailable.
 *
 * cbor2 decodes CBOR maps with string keys as plain objects and maps with
 * integer keys (COSE) as ES6 Map instances, so:
 *   - attestation object  → { fmt, attStmt, authData: Uint8Array }
 *   - COSE key            → Map<number, Uint8Array>
 */
export function extractKeyFromAttestation(
  response: AuthenticatorAttestationResponse
): string {
  const attObj = cborDecode<{ authData: Uint8Array }>(
    new Uint8Array(response.attestationObject)
  );
  const authData = attObj.authData;
  if (!(authData instanceof Uint8Array)) {
    throw new Error("authData not found in attestationObject");
  }

  // authData layout:
  //  [0..32]   rpIdHash
  //  [32]      flags  (0x40 = AT flag: has credential public key)
  //  [33..36]  signCount (u32 BE)
  //  [37..52]  aaguid (16 bytes)
  //  [53..54]  credIdLen (u16 BE)
  //  [55 .. 55+credIdLen]   credentialId
  //  [55+credIdLen ..]      COSE credentialPublicKey
  const flags = authData[32];
  if (!(flags & 0x40)) {
    throw new Error("AT flag not set — no credential public key in authData");
  }

  const credIdLen = (authData[53] << 8) | authData[54];
  const coseOffset = 55 + credIdLen;

  const coseKey = cborDecode<Map<number, Uint8Array>>(authData.slice(coseOffset));
  if (!(coseKey instanceof Map)) {
    throw new Error("COSE key did not decode to a Map");
  }

  const x = coseKey.get(-2);
  const y = coseKey.get(-3);
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error("P-256 x/y coordinates not found in COSE key");
  }

  return buildCompressedHex(x, y);
}

// ── internal ──────────────────────────────────────────────────────────────────

function buildCompressedHex(x: Uint8Array, y: Uint8Array): string {
  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(x, 1);
  uncompressed.set(y, 33);
  // p256.toHex(true) returns lowercase compressed hex — no external hex codec needed.
  return p256.ProjectivePoint.fromHex(uncompressed).toHex(true);
}
