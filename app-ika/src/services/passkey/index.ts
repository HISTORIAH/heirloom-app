import type { PasskeyRegistration, PasskeyAssertion } from "@/types/passkey";
import {
  toBase64Url,
  fromBase64Url,
  derToRawSig,
  spkiToCompressedHex,
  extractKeyFromAttestation,
} from "./codec";

const DEBUG = import.meta.env.DEV;

function checkWebAuthnSupport(): void {
  if (typeof window === "undefined") throw new Error("Not in a browser environment");
  if (!window.isSecureContext) {
    throw new Error(
      `WebAuthn requires a secure context (HTTPS or localhost). ` +
        `Current origin: ${window.location.origin}. ` +
        "If you're on a local network IP (e.g. 192.168.x.x), browsers block WebAuthn. Use localhost instead."
    );
  }
  if (!navigator.credentials)
    throw new Error("navigator.credentials not available — browser may be too old or restricted.");
  if (!window.PublicKeyCredential)
    throw new Error("PublicKeyCredential not available — browser does not support WebAuthn.");
}

// ── Registration ──────────────────────────────────────────────────────────────

export async function registerPasskey(
  userId: string,
  displayName = "Heirloom Vault"
): Promise<PasskeyRegistration> {
  if (DEBUG) console.log("[passkey] registerPasskey", { userId, origin: window.location.origin });
  checkWebAuthnSupport();

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);
  if (userIdBytes.length > 64) throw new Error(`userId too long: ${userIdBytes.length} bytes (max 64)`);

  let platformAvailable = false;
  try {
    platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (e) {
    if (DEBUG) console.warn("[passkey] isUserVerifyingPlatformAuthenticatorAvailable threw:", e);
  }

  const authenticatorSelection: AuthenticatorSelectionCriteria = platformAvailable
    ? { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" }
    : { userVerification: "required", residentKey: "preferred" };

  if (DEBUG && !platformAvailable) {
    console.log("[passkey] No platform authenticator — falling back to any authenticator.");
  }

  let cred: PublicKeyCredential;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Heirloom", id: window.location.hostname },
        user: { id: userIdBytes, name: userId, displayName },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection,
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential;
  } catch (e) {
    if (DEBUG) console.error("[passkey] navigator.credentials.create threw:", e);
    if (e instanceof DOMException) {
      const hints: Record<string, string> = {
        NotAllowedError:
          "User cancelled or browser blocked the prompt. Check HTTPS/localhost, extensions, and platform authenticator enrollment.",
        SecurityError: "Origin not allowed. Check rp.id matches the origin.",
        InvalidStateError: "Credential already exists for this authenticator.",
        NotSupportedError: "No authenticator supports ES256. Try a security key.",
      };
      throw new Error(
        `WebAuthn registration failed: ${e.name}: ${e.message}. ${hints[e.name] ?? ""}`
      );
    }
    throw new Error(`WebAuthn registration failed: ${e}`);
  }
  if (!cred) throw new Error("navigator.credentials.create returned null");

  const response = cred.response as AuthenticatorAttestationResponse;
  const credentialId = toBase64Url(cred.rawId);

  // Prefer the L3 API (Chrome 85+, Firefox 79+, Safari 16+).
  if (typeof response.getPublicKey === "function") {
    const spki = response.getPublicKey();
    if (spki) {
      try {
        return { pubkeyHex: spkiToCompressedHex(new Uint8Array(spki)), credentialId };
      } catch (e) {
        if (DEBUG) console.warn("[passkey] spkiToCompressedHex failed, falling back to attestationObject:", e);
      }
    }
  }

  // Fallback: parse attestationObject CBOR (older browsers).
  return { pubkeyHex: extractKeyFromAttestation(response), credentialId };
}

// ── Heartbeat signing ─────────────────────────────────────────────────────────

export async function signHeartbeat(
  challengeB64: string,
  credentialId: string
): Promise<PasskeyAssertion> {
  if (DEBUG) console.log("[passkey] signHeartbeat", { credentialId: credentialId ? "<present>" : "<empty>" });
  checkWebAuthnSupport();

  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = credentialId
    ? [{ type: "public-key", id: fromBase64Url(credentialId) }]
    : undefined;

  let assertion: PublicKeyCredential;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: fromBase64Url(challengeB64),
        rpId: window.location.hostname,
        allowCredentials,
        userVerification: "required",
        timeout: 60_000,
      },
    })) as PublicKeyCredential;
  } catch (e) {
    if (DEBUG) console.error("[passkey] navigator.credentials.get threw:", e);
    if (e instanceof DOMException) {
      const hints: Record<string, string> = {
        NotAllowedError:
          "User cancelled or browser blocked the prompt. Check HTTPS/localhost and extensions.",
        SecurityError: "Origin does not match rpId.",
        InvalidStateError: "No matching credential. The passkey may have been deleted.",
      };
      throw new Error(`WebAuthn sign failed: ${e.name}: ${e.message}. ${hints[e.name] ?? ""}`);
    }
    throw new Error(`WebAuthn sign failed: ${e}`);
  }
  if (!assertion) throw new Error("navigator.credentials.get returned null");

  const response = assertion.response as AuthenticatorAssertionResponse;
  return {
    signatureB64: toBase64Url(derToRawSig(new Uint8Array(response.signature))),
    authenticatorDataB64: toBase64Url(response.authenticatorData),
    clientDataJson: new TextDecoder().decode(response.clientDataJSON),
  };
}
