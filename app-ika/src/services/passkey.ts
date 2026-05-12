// WebAuthn passkey helpers for Heirloom.
//
// Registration: called once during vault creation to bind a P-256 device key.
// Signing:      called for each heartbeat to prove the device is present.

const DEBUG = true;
function log(...args: unknown[]) {
  if (DEBUG) console.log("[passkey]", ...args);
}
function logError(...args: unknown[]) {
  if (DEBUG) console.error("[passkey]", ...args);
}

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

/** Hex-encode bytes. */
function hexEncode(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PasskeyRegistration {
  /** 33-byte compressed P-256 public key, hex-encoded (66 chars, no 0x). */
  pubkeyHex: string;
  /** Credential ID, base64url encoded (for storage). */
  credentialId: string;
}

function checkWebAuthnSupport(): void {
  if (typeof window === "undefined") throw new Error("Not in a browser environment");
  if (!window.isSecureContext) {
    throw new Error(
      `WebAuthn requires a secure context (HTTPS or localhost). Current origin: ${window.location.origin}. ` +
      "If you're on a local network IP (e.g. 192.168.x.x), browsers block WebAuthn. Use localhost instead."
    );
  }
  if (!navigator.credentials) throw new Error("navigator.credentials not available — browser may be too old or in a restricted mode.");
  if (!window.PublicKeyCredential) throw new Error("PublicKeyCredential not available — browser does not support WebAuthn.");
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
  log("registerPasskey called", { userId, displayName, hostname: window.location.hostname, origin: window.location.origin });

  try {
    checkWebAuthnSupport();
  } catch (e) {
    logError("WebAuthn support check failed:", e);
    throw e;
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  log("challenge generated:", hexEncode(challenge));

  const userIdBytes = new TextEncoder().encode(userId);
  log("user.id bytes length:", userIdBytes.length, "(must be <= 64)");
  if (userIdBytes.length > 64) {
    throw new Error(`userId too long: ${userIdBytes.length} bytes (max 64)`);
  }

  const pubKeyCredParams = [{ alg: -7, type: "public-key" as const }];

  // Check whether a platform authenticator (TouchID, Windows Hello, etc.) is available.
  // If not, we omit authenticatorAttachment so the user can use a security key (cross-platform).
  let platformAvailable = false;
  try {
    platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    log("isUserVerifyingPlatformAuthenticatorAvailable:", platformAvailable);
  } catch (e) {
    logError("isUserVerifyingPlatformAuthenticatorAvailable threw:", e);
  }

  const authenticatorSelection: AuthenticatorSelectionCriteria = platformAvailable
    ? { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" }
    : { userVerification: "required", residentKey: "preferred" };

  if (!platformAvailable) {
    log("No platform authenticator detected. Falling back to any authenticator (security keys allowed).");
  }

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: "Heirloom", id: window.location.hostname },
    user: {
      id: userIdBytes,
      name: userId,
      displayName,
    },
    pubKeyCredParams,
    authenticatorSelection,
    timeout: 60_000,
    attestation: "none",
  };

  log("navigator.credentials.create options:", JSON.stringify({
    rp: publicKey.rp,
    pubKeyCredParams: publicKey.pubKeyCredParams,
    authenticatorSelection: publicKey.authenticatorSelection,
    attestation: publicKey.attestation,
    timeout: publicKey.timeout,
  }));

  log("About to call navigator.credentials.create() — if no prompt appears within 5s, your browser/OS has no available authenticator.");

  let cred: PublicKeyCredential;
  try {
    cred = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
  } catch (e) {
    logError("navigator.credentials.create threw:", e);
    if (e instanceof DOMException) {
      const hints: Record<string, string> = {
        NotAllowedError: "The user cancelled or the browser blocked the prompt. Check: (1) Are you on HTTPS/localhost? (2) Is a password-manager extension interfering? (3) Are Brave Shields / privacy modes active? (4) Is a platform authenticator (TouchID/Windows Hello) enrolled?",
        SecurityError: "The origin is not allowed to use WebAuthn. Check rp.id matches the origin.",
        InvalidStateError: "An authenticator with this credential already exists.",
        NotSupportedError: "No authenticator supports the requested algorithm (-7 / ES256). Try plugging in a security key.",
      };
      const hint = hints[e.name] || "";
      throw new Error(`WebAuthn registration failed: ${e.name}: ${e.message}. ${hint}`);
    }
    throw new Error(`WebAuthn registration failed: ${e}`);
  }

  if (!cred) {
    throw new Error("navigator.credentials.create returned null/undefined");
  }

  log("credential created:", {
    id: cred.id,
    rawIdLength: cred.rawId.byteLength,
    type: cred.type,
  });

  const response = cred.response as AuthenticatorAttestationResponse;
  log("attestation response keys:", Object.keys(response));

  // Log attestationObject for debugging
  if (response.attestationObject) {
    const attObjBytes = new Uint8Array(response.attestationObject);
    log("attestationObject length:", attObjBytes.length);
    log("attestationObject first 32 bytes:", hexEncode(attObjBytes.slice(0, 32)));
  }

  // Try getPublicKey() first (WebAuthn L3)
  if (typeof response.getPublicKey === "function") {
    try {
      const spki = response.getPublicKey();
      if (spki) {
        log("getPublicKey() returned SPKI, length:", spki.byteLength);
        const pubkeyHex = parseSpkiP256(new Uint8Array(spki));
        log("extracted pubkey from SPKI:", pubkeyHex);
        return { pubkeyHex, credentialId: b64url(cred.rawId) };
      }
    } catch (e) {
      logError("getPublicKey() failed, falling back to attestationObject parse:", e);
    }
  } else {
    log("getPublicKey() not available, using attestationObject fallback");
  }

  // Fallback: parse attestationObject manually
  try {
    const pubkeyHex = extractCompressedP256KeyFromAttestation(response);
    log("extracted pubkey from attestationObject:", pubkeyHex);
    return { pubkeyHex, credentialId: b64url(cred.rawId) };
  } catch (e) {
    logError("attestationObject parse failed:", e);
    throw new Error(`Could not extract P-256 public key from attestation: ${e}`);
  }
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
  log("signHeartbeat called", { challengeB64, credentialId: credentialId ? "<present>" : "<empty>", hostname: window.location.hostname });

  try {
    checkWebAuthnSupport();
  } catch (e) {
    logError("WebAuthn support check failed:", e);
    throw e;
  }

  const challengeBytes = b64urlDecode(challengeB64);
  log("challenge decoded, length:", challengeBytes.length);

  const allowCredentials = credentialId
    ? [{ type: "public-key" as const, id: b64urlDecode(credentialId) }]
    : undefined;

  if (allowCredentials) {
    log("allowCredentials set, credentialId length:", allowCredentials[0].id.length);
  } else {
    log("allowCredentials omitted — browser will show all available passkeys");
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: challengeBytes,
    rpId: window.location.hostname,
    allowCredentials,
    userVerification: "required",
    timeout: 60_000,
  };

  log("navigator.credentials.get options:", JSON.stringify({
    rpId: publicKey.rpId,
    allowCredentialsCount: allowCredentials?.length ?? 0,
    userVerification: publicKey.userVerification,
  }));

  let assertion: PublicKeyCredential;
  try {
    assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
  } catch (e) {
    logError("navigator.credentials.get threw:", e);
    if (e instanceof DOMException) {
      const hints: Record<string, string> = {
        NotAllowedError: "The user cancelled or the browser blocked the prompt. If no prompt appeared: (1) Check HTTPS/localhost. (2) Disable Brave Shields / privacy extensions. (3) Check if a password manager extension is intercepting.",
        SecurityError: "Origin does not match rpId.",
        InvalidStateError: "No matching credential found. The passkey may have been deleted from the authenticator.",
      };
      const hint = hints[e.name] || "";
      throw new Error(`WebAuthn sign failed: ${e.name}: ${e.message}. ${hint}`);
    }
    throw new Error(`WebAuthn sign failed: ${e}`);
  }

  if (!assertion) {
    throw new Error("navigator.credentials.get returned null/undefined");
  }

  log("assertion received:", {
    id: assertion.id,
    rawIdLength: assertion.rawId.byteLength,
  });

  const response = assertion.response as AuthenticatorAssertionResponse;
  log("assertion response keys:", Object.keys(response));
  log("authenticatorData length:", response.authenticatorData.byteLength);
  log("signature length:", response.signature.byteLength);

  // Convert DER-encoded signature to raw r||s (64 bytes)
  const rawSig = derToRawSig(new Uint8Array(response.signature));
  log("DER signature converted to raw r||s, length:", rawSig.length);

  return {
    signatureB64: b64url(rawSig),
    authenticatorDataB64: b64url(response.authenticatorData),
    clientDataJson: new TextDecoder().decode(response.clientDataJSON),
  };
}

// ── SPKI parser (reliable) ──────────────────────────────────────────────────

/**
 * Parse an SPKI (SubjectPublicKeyInfo) encoded P-256 EC public key and return
 * the 33-byte compressed public key as a hex string.
 *
 * SPKI format for P-256:
 *   30 59                           SEQUENCE
 *     30 13                         SEQUENCE
 *       06 07 2a 86 48 ce 3d 02 01   OID ecPublicKey
 *       06 08 2a 86 48 ce 3d 03 01 07 OID prime256v1
 *     03 42 00                      BIT STRING (66 bytes, 0 unused bits)
 *       04 <x:32> <y:32>            uncompressed point
 */
function parseSpkiP256(spki: Uint8Array): string {
  log("parseSpkiP256 called, SPKI length:", spki.length);

  // Expected SPKI for P-256 uncompressed point: 91 bytes
  // But parse it properly rather than assuming.
  let i = 0;

  // SEQUENCE
  if (spki[i++] !== 0x30) throw new Error("SPKI: expected SEQUENCE");
  const spkiLen = readAsn1Length(spki, i);
  i += spkiLen.bytesRead;
  if (spkiLen.value + i !== spki.length) {
    log("SPKI length mismatch, continuing anyway...");
  }

  // AlgorithmIdentifier SEQUENCE
  if (spki[i++] !== 0x30) throw new Error("SPKI: expected AlgorithmIdentifier SEQUENCE");
  const algIdLen = readAsn1Length(spki, i);
  i += algIdLen.bytesRead + algIdLen.value;

  // BIT STRING
  if (spki[i++] !== 0x03) throw new Error("SPKI: expected BIT STRING");
  const bitStrLen = readAsn1Length(spki, i);
  i += bitStrLen.bytesRead;
  const unusedBits = spki[i++];
  if (unusedBits !== 0) throw new Error(`SPKI: expected 0 unused bits, got ${unusedBits}`);

  // Uncompressed EC point
  if (spki[i++] !== 0x04) throw new Error("SPKI: expected uncompressed EC point (0x04)");
  if (spki.length - i !== 64) throw new Error(`SPKI: expected 64 bytes for x||y, got ${spki.length - i}`);

  const x = spki.slice(i, i + 32);
  const y = spki.slice(i + 32, i + 64);
  return compressP256(x, y);
}

function readAsn1Length(buf: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let b = buf[offset];
  if ((b & 0x80) === 0) {
    return { value: b, bytesRead: 1 };
  }
  const numBytes = b & 0x7f;
  let value = 0;
  for (let j = 0; j < numBytes; j++) {
    value = (value << 8) | buf[offset + 1 + j];
  }
  return { value, bytesRead: 1 + numBytes };
}

// ── Attestation-object fallback (more robust CBOR scan) ─────────────────────

function extractCompressedP256KeyFromAttestation(
  response: AuthenticatorAttestationResponse
): string {
  const attObj = new Uint8Array(response.attestationObject);
  log("extractCompressedP256KeyFromAttestation, attObj length:", attObj.length);

  // Parse CBOR map to find "authData" key
  const authData = extractCborByteString(attObj, "authData");
  if (!authData) throw new Error("authData not found in attestationObject");
  log("authData extracted, length:", authData.length);

  // authData layout:
  // [0..32]: rpIdHash
  // [32]:    flags
  // [33..36]: signCount (u32 BE)
  // if AT flag (0x40): aaguid(16) + credIdLen(u16 BE) + credentialId + COSE key
  const flags = authData[32];
  log("authData flags:", flags.toString(2).padStart(8, "0"), "AT=", !!(flags & 0x40), "ED=", !!(flags & 0x80));

  if (!(flags & 0x40)) throw new Error("AT flag not set in authData — no credential public key present");

  let offset = 37; // after rpIdHash(32) + flags(1) + signCount(4)
  offset += 16; // skip aaguid

  const credIdLen = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;
  log("credentialId length:", credIdLen);
  offset += credIdLen; // skip credentialId

  // Now offset points to the COSE credentialPublicKey
  const coseKey = authData.slice(offset);
  log("COSE key remaining bytes:", coseKey.length);

  const { x, y } = parseCoseKey(coseKey);
  return compressP256(x, y);
}

/**
 * Scan a CBOR-encoded map for a specific text key and return the associated
 * byte-string value.
 */
function extractCborByteString(cbor: Uint8Array, key: string): Uint8Array | null {
  const keyBytes = new TextEncoder().encode(key);
  let i = 0;

  // Expect a CBOR map
  const b = cbor[i++];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major !== 5) throw new Error(`Expected CBOR map (major 5), got major ${major}`);

  let numEntries: number;
  if (info < 24) {
    numEntries = info;
  } else if (info === 24) {
    numEntries = cbor[i++];
  } else if (info === 25) {
    numEntries = (cbor[i] << 8) | cbor[i + 1];
    i += 2;
  } else if (info === 26) {
    numEntries = (cbor[i] << 24) | (cbor[i + 1] << 16) | (cbor[i + 2] << 8) | cbor[i + 3];
    i += 4;
  } else if (info === 31) {
    throw new Error("Indefinite-length CBOR maps not supported");
  } else {
    throw new Error(`Unsupported CBOR map length info: ${info}`);
  }

  log("CBOR map has", numEntries, "entries");

  for (let entry = 0; entry < numEntries; entry++) {
    // Read key (expect text string)
    const keyResult = readCborTextString(cbor, i);
    if (!keyResult) return null;
    i += keyResult.bytesRead;

    if (keyResult.text === key) {
      // Read value (expect byte string)
      const valResult = readCborByteString(cbor, i);
      if (!valResult) throw new Error(`Value for "${key}" is not a byte string`);
      return valResult.bytes;
    } else {
      // Skip value
      const skip = skipCborValue(cbor, i);
      i += skip;
    }
  }

  return null;
}

function readCborTextString(buf: Uint8Array, i: number): { text: string; bytesRead: number } | null {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major !== 3) return null;

  let len: number;
  let headerLen: number;
  if (info < 24) {
    len = info;
    headerLen = 1;
  } else if (info === 24) {
    len = buf[i + 1];
    headerLen = 2;
  } else if (info === 25) {
    len = (buf[i + 1] << 8) | buf[i + 2];
    headerLen = 3;
  } else {
    throw new Error(`Unsupported CBOR text string length info: ${info}`);
  }

  const text = new TextDecoder().decode(buf.slice(i + headerLen, i + headerLen + len));
  return { text, bytesRead: headerLen + len };
}

function readCborByteString(buf: Uint8Array, i: number): { bytes: Uint8Array; bytesRead: number } | null {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major !== 2) return null;

  let len: number;
  let headerLen: number;
  if (info < 24) {
    len = info;
    headerLen = 1;
  } else if (info === 24) {
    len = buf[i + 1];
    headerLen = 2;
  } else if (info === 25) {
    len = (buf[i + 1] << 8) | buf[i + 2];
    headerLen = 3;
  } else {
    throw new Error(`Unsupported CBOR byte string length info: ${info}`);
  }

  return { bytes: buf.slice(i + headerLen, i + headerLen + len), bytesRead: headerLen + len };
}

function parseCoseKey(cbor: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  // COSE EC2 key is a CBOR map with keys:
  //   1 (kty) = 2 (EC2)
  //  -1 (crv) = 1 (P-256)
  //  -2 (x)   = byte string
  //  -3 (y)   = byte string
  let i = 0;
  const b = cbor[i++];
  const major = b >> 5;
  const info = b & 0x1f;
  if (major !== 5) throw new Error(`Expected COSE key to be a map, got major ${major}`);

  let numEntries: number;
  if (info < 24) {
    numEntries = info;
  } else if (info === 24) {
    numEntries = cbor[i++];
  } else if (info === 25) {
    numEntries = (cbor[i] << 8) | cbor[i + 1];
    i += 2;
  } else {
    throw new Error(`Unsupported COSE map length info: ${info}`);
  }

  let x: Uint8Array | null = null;
  let y: Uint8Array | null = null;

  for (let entry = 0; entry < numEntries; entry++) {
    const keyResult = readCborInt(cbor, i);
    i += keyResult.bytesRead;

    if (keyResult.value === -2) {
      const val = readCborByteString(cbor, i);
      if (!val) throw new Error("Expected byte string for x coordinate");
      x = val.bytes;
      i += val.bytesRead;
    } else if (keyResult.value === -3) {
      const val = readCborByteString(cbor, i);
      if (!val) throw new Error("Expected byte string for y coordinate");
      y = val.bytes;
      i += val.bytesRead;
    } else {
      i += skipCborValue(cbor, i);
    }
  }

  if (!x || !y) throw new Error(`P-256 key not found in COSE map (x=${!!x}, y=${!!y})`);
  if (x.length !== 32) throw new Error(`Expected x=32 bytes, got ${x.length}`);
  if (y.length !== 32) throw new Error(`Expected y=32 bytes, got ${y.length}`);
  return { x, y };
}

function readCborInt(buf: Uint8Array, i: number): { value: number; bytesRead: number } {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;

  if (major === 0) {
    // Unsigned
    if (info < 24) return { value: info, bytesRead: 1 };
    if (info === 24) return { value: buf[i + 1], bytesRead: 2 };
    if (info === 25) return { value: (buf[i + 1] << 8) | buf[i + 2], bytesRead: 3 };
    throw new Error("Unsupported unsigned int length");
  }

  if (major === 1) {
    // Negative: value = -1 - raw
    let raw: number;
    if (info < 24) raw = info;
    else if (info === 24) raw = buf[i + 1];
    else if (info === 25) raw = (buf[i + 1] << 8) | buf[i + 2];
    else throw new Error("Unsupported negative int length");
    return { value: -(raw + 1), bytesRead: info < 24 ? 1 : info === 24 ? 2 : 3 };
  }

  throw new Error(`Expected integer at offset ${i}, got major type ${major}`);
}

function skipCborValue(buf: Uint8Array, i: number): number {
  const b = buf[i];
  const major = b >> 5;
  const info = b & 0x1f;

  if (major === 0 || major === 1) {
    if (info < 24) return 1;
    if (info === 24) return 2;
    if (info === 25) return 3;
    if (info === 26) return 5;
    throw new Error("Unsupported integer skip length");
  }

  if (major === 2 || major === 3) {
    // Byte string or text string
    let len: number;
    let header: number;
    if (info < 24) {
      len = info;
      header = 1;
    } else if (info === 24) {
      len = buf[i + 1];
      header = 2;
    } else if (info === 25) {
      len = (buf[i + 1] << 8) | buf[i + 2];
      header = 3;
    } else {
      throw new Error("Unsupported string skip length");
    }
    return header + len;
  }

  if (major === 4) {
    // Array
    let len: number;
    let header: number;
    if (info < 24) {
      len = info;
      header = 1;
    } else if (info === 24) {
      len = buf[i + 1];
      header = 2;
    } else if (info === 25) {
      len = (buf[i + 1] << 8) | buf[i + 2];
      header = 3;
    } else {
      throw new Error("Unsupported array skip length");
    }
    let total = header;
    for (let j = 0; j < len; j++) {
      total += skipCborValue(buf, i + total);
    }
    return total;
  }

  if (major === 5) {
    // Map
    let len: number;
    let header: number;
    if (info < 24) {
      len = info;
      header = 1;
    } else if (info === 24) {
      len = buf[i + 1];
      header = 2;
    } else if (info === 25) {
      len = (buf[i + 1] << 8) | buf[i + 2];
      header = 3;
    } else {
      throw new Error("Unsupported map skip length");
    }
    let total = header;
    for (let j = 0; j < len; j++) {
      total += skipCborValue(buf, i + total); // key
      total += skipCborValue(buf, i + total); // value
    }
    return total;
  }

  if (major === 6) {
    // Tag
    if (info < 24) return 1;
    if (info === 24) return 2;
    if (info === 25) return 3;
    throw new Error("Unsupported tag skip length");
  }

  if (major === 7) {
    // Simple/float
    if (info < 24) return 1;
    if (info === 24) return 2;
    if (info === 25) return 3;
    if (info === 26) return 5;
    if (info === 27) return 9;
    return 1;
  }

  throw new Error(`Unknown CBOR major type ${major}`);
}

function compressP256(x: Uint8Array, y: Uint8Array): string {
  if (x.length !== 32) throw new Error(`compressP256: x must be 32 bytes, got ${x.length}`);
  if (y.length !== 32) throw new Error(`compressP256: y must be 32 bytes, got ${y.length}`);
  const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return hexEncode(compressed);
}

/**
 * Convert a DER-encoded ECDSA signature to raw r||s (64 bytes).
 * WebAuthn authenticators return DER; the secp256r1 precompile expects raw.
 */
function derToRawSig(der: Uint8Array): Uint8Array {
  log("derToRawSig called, DER length:", der.length);
  if (der.length < 8) throw new Error(`DER signature too short: ${der.length}`);

  // DER: 30 <total-len> 02 <r-len> <r> 02 <s-len> <s>
  if (der[0] !== 0x30) throw new Error(`DER: expected 0x30, got 0x${der[0].toString(16)}`);

  let i = 2; // skip 30 <total-len>
  if (der[i++] !== 0x02) throw new Error(`DER: expected 0x02 before r`);

  const rLen = der[i++];
  const r = der.slice(i, i + rLen);
  i += rLen;

  if (der[i++] !== 0x02) throw new Error(`DER: expected 0x02 before s`);
  const sLen = der[i++];
  const s = der.slice(i, i + sLen);

  const padTo32 = (buf: Uint8Array): Uint8Array => {
    const trimmed = buf[0] === 0 ? buf.slice(1) : buf;
    const out = new Uint8Array(32);
    out.set(trimmed, 32 - trimmed.length);
    return out;
  };

  const raw = new Uint8Array(64);
  raw.set(padTo32(r), 0);
  raw.set(padTo32(s), 32);
  log("derToRawSig output length:", raw.length);
  return raw;
}
