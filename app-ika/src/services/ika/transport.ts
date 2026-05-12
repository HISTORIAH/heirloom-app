import { IKA_GRPC_URL } from "@/config/constants";
import type { IkaGrpcTransport } from "@/types";

/**
 * Check if WebAuthn / passkeys are available in this browser.
 */
export async function isIkaAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return !!window.PublicKeyCredential;
}

/**
 * HTTP transport that proxies to the Rust backend.
 *
 * The backend forwards to the Ika gRPC network. The browser never speaks
 * raw gRPC — it sends hex-encoded BCS bytes over HTTP POST.
 */
export function createHttpTransport(baseUrl: string = IKA_GRPC_URL): IkaGrpcTransport {
  return {
    async submitTransaction(userSignature, signedRequestData) {
      const response = await fetch(`${baseUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_signature: bytesToHex(userSignature),
          signed_request_data: bytesToHex(signedRequestData),
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ika proxy error: ${err}`);
      }

      const { response_data } = await response.json();
      return hexToBytes(response_data);
    },
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
