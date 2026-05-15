export interface PasskeyRegistration {
  /** 33-byte compressed P-256 public key, hex-encoded (66 chars, no 0x). */
  pubkeyHex: string;
  /** Credential ID, base64url encoded (for localStorage). */
  credentialId: string;
}

export interface PasskeyAssertion {
  /** 64-byte r||s signature, base64url encoded. */
  signatureB64: string;
  /** Raw authenticatorData bytes, base64url encoded. */
  authenticatorDataB64: string;
  /** clientDataJSON as UTF-8 string. */
  clientDataJson: string;
}
