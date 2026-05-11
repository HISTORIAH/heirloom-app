import { bcs, type InferBcsInput } from "@mysten/bcs";

// ── BCS Types (match crates/ika-dwallet-types/src/lib.rs) ──

export const ChainId = bcs.enum("ChainId", { Solana: null, Sui: null });

export const DWalletCurve = bcs.enum("DWalletCurve", {
  Secp256k1: null,
  Secp256r1: null,
  Curve25519: null,
  Ristretto: null,
});

export const DWalletSignatureScheme = bcs.enum("DWalletSignatureScheme", {
  EcdsaKeccak256: null,
  EcdsaSha256: null,
  EcdsaDoubleSha256: null,
  TaprootSha256: null,
  EcdsaBlake2b256: null,
  EddsaSha512: null,
  SchnorrkelMerlin: null,
});

export const ApprovalProof = bcs.enum("ApprovalProof", {
  Solana: bcs.struct("ApprovalProofSolana", {
    transaction_signature: bcs.vector(bcs.u8()),
    slot: bcs.u64(),
  }),
  Sui: bcs.struct("ApprovalProofSui", {
    effects_certificate: bcs.vector(bcs.u8()),
  }),
});

export const UserSignature = bcs.enum("UserSignature", {
  Ed25519: bcs.struct("UserSignatureEd25519", {
    signature: bcs.vector(bcs.u8()),
    public_key: bcs.vector(bcs.u8()),
  }),
  Secp256k1: bcs.struct("UserSignatureSecp256k1", {
    signature: bcs.vector(bcs.u8()),
    public_key: bcs.vector(bcs.u8()),
  }),
  Secp256r1: bcs.struct("UserSignatureSecp256r1", {
    signature: bcs.vector(bcs.u8()),
    public_key: bcs.vector(bcs.u8()),
  }),
});

export const NetworkSignedAttestation = bcs.struct("NetworkSignedAttestation", {
  attestation_data: bcs.vector(bcs.u8()),
  network_signature: bcs.vector(bcs.u8()),
  network_pubkey: bcs.vector(bcs.u8()),
  epoch: bcs.u64(),
});

export const SignDuringDKGRequest = bcs.struct("SignDuringDKGRequest", {
  presign_session_identifier: bcs.vector(bcs.u8()),
  presign: bcs.vector(bcs.u8()),
  signature_scheme: DWalletSignatureScheme,
  message: bcs.vector(bcs.u8()),
  message_metadata: bcs.vector(bcs.u8()),
  message_centralized_signature: bcs.vector(bcs.u8()),
});

export const UserSecretKeyShare = bcs.enum("UserSecretKeyShare", {
  Encrypted: bcs.struct("UserSecretKeyShareEncrypted", {
    encrypted_centralized_secret_share_and_proof: bcs.vector(bcs.u8()),
    encryption_key: bcs.vector(bcs.u8()),
    signer_public_key: bcs.vector(bcs.u8()),
  }),
  Public: bcs.struct("UserSecretKeySharePublic", {
    public_user_secret_key_share: bcs.vector(bcs.u8()),
  }),
});

export const DWalletRequest = bcs.enum("DWalletRequest", {
  DKG: bcs.struct("DKG", {
    dwallet_network_encryption_public_key: bcs.vector(bcs.u8()),
    curve: DWalletCurve,
    centralized_public_key_share_and_proof: bcs.vector(bcs.u8()),
    user_secret_key_share: UserSecretKeyShare,
    user_public_output: bcs.vector(bcs.u8()),
    sign_during_dkg_request: bcs.option(SignDuringDKGRequest),
  }),
  Sign: bcs.struct("Sign", {
    message: bcs.vector(bcs.u8()),
    message_metadata: bcs.vector(bcs.u8()),
    presign_session_identifier: bcs.vector(bcs.u8()),
    message_centralized_signature: bcs.vector(bcs.u8()),
    dwallet_attestation: NetworkSignedAttestation,
    approval_proof: ApprovalProof,
  }),
  PresignForDWallet: bcs.struct("PresignForDWallet", {
    dwallet_network_encryption_public_key: bcs.vector(bcs.u8()),
    dwallet_public_key: bcs.vector(bcs.u8()),
    dwallet_attestation: NetworkSignedAttestation,
    curve: DWalletCurve,
    signature_algorithm: bcs.enum("DWalletSignatureAlgorithm", {
      ECDSASecp256k1: null,
      ECDSASecp256r1: null,
      Taproot: null,
      EdDSA: null,
      SchnorrkelSubstrate: null,
    }),
  }),
});

export const SignedRequestData = bcs.struct("SignedRequestData", {
  session_identifier_preimage: bcs.fixedArray(32, bcs.u8()),
  epoch: bcs.u64(),
  chain_id: ChainId,
  intended_chain_sender: bcs.vector(bcs.u8()),
  request: DWalletRequest,
});

export const TransactionResponseData = bcs.enum("TransactionResponseData", {
  Signature: bcs.struct("SignatureResponse", { signature: bcs.vector(bcs.u8()) }),
  Attestation: NetworkSignedAttestation,
  Error: bcs.struct("ErrorResponse", { message: bcs.string() }),
});

export const VersionedDWalletDataAttestation = bcs.enum("VersionedDWalletDataAttestation", {
  V1: bcs.struct("DWalletDataAttestationV1", {
    session_identifier: bcs.fixedArray(32, bcs.u8()),
    intended_chain_sender: bcs.vector(bcs.u8()),
    curve: DWalletCurve,
    public_key: bcs.vector(bcs.u8()),
    public_output: bcs.vector(bcs.u8()),
    is_imported_key: bcs.bool(),
    sign_during_dkg_signature: bcs.option(bcs.vector(bcs.u8())),
  }),
});

export const VersionedPresignDataAttestation = bcs.enum("VersionedPresignDataAttestation", {
  V1: bcs.struct("PresignDataAttestationV1", {
    session_identifier: bcs.fixedArray(32, bcs.u8()),
    epoch: bcs.u64(),
    presign_session_identifier: bcs.vector(bcs.u8()),
    presign_data: bcs.vector(bcs.u8()),
    curve: DWalletCurve,
    signature_algorithm: bcs.enum("DWalletSignatureAlgorithm", {
      ECDSASecp256k1: null,
      ECDSASecp256r1: null,
      Taproot: null,
      EdDSA: null,
      SchnorrkelSubstrate: null,
    }),
    dwallet_public_key: bcs.option(bcs.vector(bcs.u8())),
    user_pubkey: bcs.vector(bcs.u8()),
  }),
});

// ── Helpers ──

export type SignedRequestInput = InferBcsInput<typeof SignedRequestData>;
export type UserSignatureInput = InferBcsInput<typeof UserSignature>;

export function curveToBcs(curve: number): Record<string, true> {
  switch (curve) {
    case 0:
      return { Secp256k1: true };
    case 1:
      return { Secp256r1: true };
    case 2:
      return { Curve25519: true };
    case 3:
      return { Ristretto: true };
    default:
      throw new Error(`Unknown curve: ${curve}`);
  }
}

export function sigSchemeToBcs(scheme: number): Record<string, true> {
  switch (scheme) {
    case 0:
      return { EcdsaKeccak256: true };
    case 1:
      return { EcdsaSha256: true };
    case 2:
      return { EcdsaDoubleSha256: true };
    case 3:
      return { TaprootSha256: true };
    case 4:
      return { EcdsaBlake2b256: true };
    case 5:
      return { EddsaSha512: true };
    case 6:
      return { SchnorrkelMerlin: true };
    default:
      throw new Error(`Unknown signature scheme: ${scheme}`);
  }
}

export function buildUserSignature(
  variant: "Ed25519" | "Secp256k1" | "Secp256r1",
  publicKey: Uint8Array,
  signature: Uint8Array,
): Uint8Array {
  const input = {
    [variant]: { signature: Array.from(signature), public_key: Array.from(publicKey) },
  } as unknown as import("@mysten/bcs").EnumInputShape<{
    Ed25519: {
      signature: Iterable<number> & { length: number };
      public_key: Iterable<number> & { length: number };
    };
    Secp256k1: {
      signature: Iterable<number> & { length: number };
      public_key: Iterable<number> & { length: number };
    };
    Secp256r1: {
      signature: Iterable<number> & { length: number };
      public_key: Iterable<number> & { length: number };
    };
  }>;
  return UserSignature.serialize(input).toBytes();
}
