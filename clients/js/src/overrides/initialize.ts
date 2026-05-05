/**
 * Override for the codama-generated initialize instruction.
 *
 * The generated encoder uses a u32 length prefix for `label`, but the program
 * (Quasar `String<32>`) reads a u8 length prefix on the wire. Sending u32 made
 * the program parse the next 4 bytes as the active string — so "heir" was
 * stored as ['\0','\0','\0','h'] and rendered as "h" everywhere. Fix by
 * re-encoding `data` with a u8 prefix; account resolution is reused from the
 * generated builder.
 *
 * Import from this file instead of the generated one.
 */

export {
  INITIALIZE_DISCRIMINATOR,
  getInitializeDiscriminatorBytes,
  parseInitializeInstruction,
  type InitializeAsyncInput,
  type InitializeInput,
  type InitializeInstruction,
  type InitializeInstructionData,
  type InitializeInstructionDataArgs,
  type ParsedInitializeInstruction,
} from "../generated/instructions/initialize";

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  transformEncoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
} from "@solana/kit";
import {
  INITIALIZE_DISCRIMINATOR,
  getInitializeInstruction as _getInitializeInstruction,
  getInitializeInstructionAsync as _getInitializeInstructionAsync,
  type InitializeAsyncInput,
  type InitializeInput,
  type InitializeInstruction,
  type InitializeInstructionData,
  type InitializeInstructionDataArgs,
} from "../generated/instructions/initialize";

export function getInitializeInstructionDataEncoder(): Encoder<InitializeInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ["discriminator", fixEncoderSize(getBytesEncoder(), 1)],
      ["heartbeatInterval", getI64Encoder()],
      ["gracePeriod", getI64Encoder()],
      ["pauseDuration", getI64Encoder()],
      ["amount", getU64Encoder()],
      ["label", addEncoderSizePrefix(getUtf8Encoder(), getU8Encoder())],
    ]),
    (value) => ({ ...value, discriminator: INITIALIZE_DISCRIMINATOR }),
  );
}

export function getInitializeInstructionDataDecoder(): Decoder<InitializeInstructionData> {
  return getStructDecoder([
    ["discriminator", fixDecoderSize(getBytesDecoder(), 1)],
    ["heartbeatInterval", getI64Decoder()],
    ["gracePeriod", getI64Decoder()],
    ["pauseDuration", getI64Decoder()],
    ["amount", getU64Decoder()],
    ["label", addDecoderSizePrefix(getUtf8Decoder(), getU8Decoder())],
  ]) as Decoder<InitializeInstructionData>;
}

export function getInitializeInstructionDataCodec(): Codec<
  InitializeInstructionDataArgs,
  InitializeInstructionData
> {
  return combineCodec(
    getInitializeInstructionDataEncoder(),
    getInitializeInstructionDataDecoder(),
  );
}

export async function getInitializeInstructionAsync<
  TAccountAuthority extends string,
  TAccountHeir extends string,
  TAccountDelegate extends string,
  TAccountHbSigner extends string,
  TAccountAuthorityTokenAccount extends string,
  TAccountEstate extends string,
  TAccountVault extends string,
  TAccountVaultTokenAccount extends string,
  TAccountMint extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountRent extends string,
  TAccountClock extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = Address,
>(
  input: InitializeAsyncInput<
    TAccountAuthority,
    TAccountHeir,
    TAccountDelegate,
    TAccountHbSigner,
    TAccountAuthorityTokenAccount,
    TAccountEstate,
    TAccountVault,
    TAccountVaultTokenAccount,
    TAccountMint,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountRent,
    TAccountClock,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress },
): Promise<
  InitializeInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountHeir,
    TAccountDelegate,
    TAccountHbSigner,
    TAccountAuthorityTokenAccount,
    TAccountEstate,
    TAccountVault,
    TAccountVaultTokenAccount,
    TAccountMint,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountRent,
    TAccountClock,
    TAccountSystemProgram
  >
> {
  const ix = await _getInitializeInstructionAsync(input, config);
  const data = getInitializeInstructionDataEncoder().encode(
    input as InitializeInstructionDataArgs,
  );
  return { ...ix, data } as InitializeInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountHeir,
    TAccountDelegate,
    TAccountHbSigner,
    TAccountAuthorityTokenAccount,
    TAccountEstate,
    TAccountVault,
    TAccountVaultTokenAccount,
    TAccountMint,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountRent,
    TAccountClock,
    TAccountSystemProgram
  >;
}

export function getInitializeInstruction<
  TAccountAuthority extends string,
  TAccountHeir extends string,
  TAccountDelegate extends string,
  TAccountHbSigner extends string,
  TAccountAuthorityTokenAccount extends string,
  TAccountEstate extends string,
  TAccountVault extends string,
  TAccountVaultTokenAccount extends string,
  TAccountMint extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountRent extends string,
  TAccountClock extends string,
  TAccountSystemProgram extends string,
  TProgramAddress extends Address = Address,
>(
  input: InitializeInput<
    TAccountAuthority,
    TAccountHeir,
    TAccountDelegate,
    TAccountHbSigner,
    TAccountAuthorityTokenAccount,
    TAccountEstate,
    TAccountVault,
    TAccountVaultTokenAccount,
    TAccountMint,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountRent,
    TAccountClock,
    TAccountSystemProgram
  >,
  config?: { programAddress?: TProgramAddress },
): InitializeInstruction<
  TProgramAddress,
  TAccountAuthority,
  TAccountHeir,
  TAccountDelegate,
  TAccountHbSigner,
  TAccountAuthorityTokenAccount,
  TAccountEstate,
  TAccountVault,
  TAccountVaultTokenAccount,
  TAccountMint,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountRent,
  TAccountClock,
  TAccountSystemProgram
> {
  const ix = _getInitializeInstruction(input, config);
  const data = getInitializeInstructionDataEncoder().encode(
    input as InitializeInstructionDataArgs,
  );
  return { ...ix, data } as InitializeInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountHeir,
    TAccountDelegate,
    TAccountHbSigner,
    TAccountAuthorityTokenAccount,
    TAccountEstate,
    TAccountVault,
    TAccountVaultTokenAccount,
    TAccountMint,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountRent,
    TAccountClock,
    TAccountSystemProgram
  >;
}
