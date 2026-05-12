// WebAuthn passkey helpers for Heirloom.
//
// Registration: called once during vault creation to bind a P-256 device key.
// Signing:      called for each heartbeat to prove the device is present.

/** base64url encode without padding (matching the WebAuthn spec). */
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** base64url decode (handles padding-free strings). */
function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface PasskeyRegistration {
  /** 33-byte compressed P-256 public key, hex-encoded (66 chars, no 0x). */
  pubkeyHex: string;
  /** Credential ID, base64url encoded (for storage). */
  credentialId: string;
}

/**
 * Register a new passkey for this device.
 *
 * Returns the compressed P-256 public key (33 bytes hex) to be sent to the
 * backend and stored as `passkey_auth.raw_pubkey` for on-chain verification.
 */
export async function registerPasskey(
  userId: string,
  displayName: string = "Heirloom Vault"
): Promise<PasskeyRegistration> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Heirloom", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256 = ECDSA P-256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      attestation: "none",
    },
  }) as PublicKeyCredential;

  const response = cred.response as AuthenticatorAttestationResponse;

  // Extract the COSE public key from attestationObject → authData → credentialPublicKey
  const pubkeyHex = await extractCompressedP256Key(response);

  return {
    pubkeyHex,
    credentialId: b64url(cred.rawId),
  };
}

export interface PasskeyAssertion {
  /** 64-byte r||s signature, base64url encoded. */
  signatureB64: string;
  /** Raw authenticatorData bytes, base64url encoded. */
  authenticatorDataB64: string;
  /** clientDataJSON as UTF-8 string. */
  clientDataJson: string;
}

/**
 * Sign a heartbeat challenge with the device passkey.
 *
 * `challengeB64` is the base64url challenge returned by GET /heartbeat/:estate_id.
 * `credentialId` is the stored credential ID from registration.
 */
export async function signHeartbeat(
  challengeB64: string,
  credentialId: string
): Promise<PasskeyAssertion> {
  const challengeBytes = Uint8Array.from(b64urlDecode(challengeB64));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challengeBytes,
      rpId: window.location.hostname,
      allowCredentials: credentialId
        ? [{ type: "public-key", id: b64urlDecode(credentialId) }]
        : [],
      userVerification: "required",
      timeout: 60_000,
    },
  }) as PublicKeyCredential;

  const response = assertion.response as AuthenticatorAssertionResponse;

  // Convert DER-encoded signature to raw r||s (64 bytes)
  const rawSig = derToRawSig(new Uint8Array(response.signature));

  return {
    signatureB64: b64url(rawSig),
    authenticatorDataB64: b64url(response.authenticatorData),
    clientDataJson: new TextDecoder().decode(response.clientDataJSON),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Extract the 33-byte compressed P-256 public key from an attestation response.
 * Parses: attestationObject → CBOR → authData → credentialPublicKey (COSE).
 */
async function extractCompressedP256Key(
  response: AuthenticatorAttestationResponse
): Promise<string> {
  // getPublicKey() is available in modern browsers (Level 3)
  if (typeof response.getPublicKey === "function") {
    const spki = response.getPublicKey();
    if (spki) {
      // SPKI format: the last 65 bytes are the uncompressed public key (0x04 || x || y)
      const spkiBytes = new Uint8Array(spki);
      const uncompressed = spkiBytes.slice(spkiBytes.length - 65);
      if (uncompressed[0] !== 0x04) throw new Error("Expected uncompressed P-256 key");
      return compressP256(uncompressed.slice(1, 33), uncompressed.slice(33, 65));
    }
  }

  // Fallback: parse the CBOR attestationObject manually
  const attObj = new Uint8Array(response.attestationObject);
  // authData starts at a fixed offset in the CBOR for "none" attestation
  // Format: fmt(4 bytes) + attStmt(1 byte empty map) + authData(rest after CBOR map header)
  // For "none" attestation CBOR is: a3 63 fmt 64 6e6f6e65 67 61747453746d74 a0 68 61757468 44617461 <len> <authData>
  // Simplest: use getPublicKeyAlgorithm and look for the COSE key in authData
  const authData = extractAuthData(attObj);
  if (!authData) throw new Error("Could not extract authData from attestationObject");

  // authData layout:
  // [0..32]: rpIdHash
  // [32]:    flags
  // [33..36]: signCount (u32 BE)
  // [37..52]: aaguid (16 bytes) — only if AT flag set
  // [53..54]: credIdLen (u16 BE)
  // [55..55+credIdLen]: credentialId
  // then: COSE public key (CBOR map)
  const view = new DataView(authData.buffer, authData.byteOffset);
  const flags = authData[32];
  if (!(flags & 0x40)) throw new Error("AT flag not set in authData");

  let offset = 55;
  const credIdLen = view.getUint16(37 + 16, false); // after rpIdHash(32) + flags(1) + signCount(4) + aaguid(16)
  offset = 37 + 16 + 2 + credIdLen; // skip to COSE key

  // COSE key: map with keys -2 (x) and -3 (y), both 32 bytes
  const { x, y } = parseCoseKey(authData.slice(offset));
  return compressP256(x, y);
}

function compressP256(x: Uint8Array, y: Uint8Array): string {
  const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return Array.from(compressed).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCoseKey(cbor: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  // Minimal CBOR parser for COSE EC2 key (enough for P-256 attestation)
  // Expects: a5 01 02 03 26 20 01 21 58 20 <x:32> 22 58 20 <y:32>
  // or similar structure. We scan for -2 (0x21) and -3 (0x22) keys.
  let i = 0;
  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;

  // Skip map header (first byte)
  i++;

  while (i < cbor.length && (!x || !y)) {
    const key = readCborInt(cbor, i);
    i += key.bytesRead;
    if (key.value === -2) {
      const val = readCborBytes(cbor, i);
      i += val.bytesRead;
      x = val.bytes;
    } else if (key.value === -3) {
      const val = readCborBytes(cbor, i);
      i += val.bytesRead;
      y = val.bytes;
    } else {
      // Skip value
      i += skipCborValue(cbor, i);
    }
  }

  if (!x || !y) throw new Error("P-256 key not found in COSE map");
  return { x, y };
}

function readCborInt(buf: Uint8Array, i: number): { value: number; bytesRead: number } {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major === 0) return { value: info < 24 ? info : buf[i + 1], bytesRead: info < 24 ? 1 : 2 };
  if (major === 1) {
    const raw = info < 24 ? info : buf[i + 1];
    return { value: -(raw + 1), bytesRead: info < 24 ? 1 : 2 };
  }
  return { value: 0, bytesRead: 1 };
}

function readCborBytes(buf: Uint8Array, i: number): { bytes: Uint8Array; bytesRead: number } {
  const b = buf[i];
  const info = b & 0x1f;
  if (info < 24) return { bytes: buf.slice(i + 1, i + 1 + info), bytesRead: 1 + info };
  if (info === 24) {
    const len = buf[i + 1];
    return { bytes: buf.slice(i + 2, i + 2 + len), bytesRead: 2 + len };
  }
  throw new Error("Unexpected CBOR byte string length");
}

function skipCborValue(buf: Uint8Array, i: number): number {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major <= 1) return info < 24 ? 1 : 2;
  if (major === 2 || major === 3) {
    if (info < 24) return 1 + info;
    if (info === 24) return 2 + buf[i + 1];
  }
  return 1;
}

function extractAuthData(attObj: Uint8Array): Uint8Array | null {
  // Search for "authData" CBOR text key followed by bytes
  const needle = new TextEncoder().encode("authData");
  for (let i = 0; i < attObj.length - needle.length - 3; i++) {
    if (attObj[i + 1] === needle.length) {
      let match = true;
      for (let j = 0; j < needle.length; j++) {
        if (attObj[i + 2 + j] !== needle[j]) { match = false; break; }
      }
      if (match) {
        const after = i + 2 + needle.length;
        const lenByte = attObj[after] & 0x1f;
        if (lenByte < 24) return attObj.slice(after + 1, after + 1 + lenByte);
        if (lenByte === 24) {
          const len = attObj[after + 1];
          return attObj.slice(after + 2, after + 2 + len);
        }
        if (lenByte === 25) {
          const len = (attObj[after + 1] << 8) | attObj[after + 2];
          return attObj.slice(after + 3, after + 3 + len);
        }
      }
    }
  }
  return null;
}

/**
 * Convert a DER-encoded ECDSA signature to raw r||s (64 bytes).
 * WebAuthn authenticators return DER; the secp256r1 precompile expects raw.
 */
function derToRawSig(der: Uint8Array): Uint8Array {
  // DER: 30 <len> 02 <rlen> <r> 02 <slen> <s>
  let i = 2; // skip 30 <len>
  i++; // skip 02
  const rLen = der[i++];
  const r = der.slice(i, i + rLen);
  i += rLen;
  i++; // skip 02
  const sLen = der[i++];
  const s = der.slice(i, i + sLen);

  // Strip leading zero padding and left-pad to 32 bytes
  const padTo32 = (buf: Uint8Array): Uint8Array => {
    const trimmed = buf[0] === 0 ? buf.slice(1) : buf;
    const out = new Uint8Array(32);
    out.set(trimmed, 32 - trimmed.length);
    return out;
  };

  const raw = new Uint8Array(64);
  raw.set(padTo32(r), 0);
  raw.set(padTo32(s), 32);
  return raw;
}
