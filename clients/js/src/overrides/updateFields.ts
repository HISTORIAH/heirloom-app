/**
 * Override for the codama-generated updateFields instruction.
 *
 * The generated encoder uses getOptionEncoder which encodes None as a single
 * 0x00 byte. Quasar's OptionZc<i64> is always 9 bytes (1 tag + 8 value), so
 * we replace the codec here and re-export everything else from generated.
 *
 * Import from this file instead of the generated one.
 */

export {
  UPDATE_FIELDS_DISCRIMINATOR,
  getUpdateFieldsDiscriminatorBytes,
  getUpdateFieldsInstruction,
  parseUpdateFieldsInstruction,
  type ParsedUpdateFieldsInstruction,
  type UpdateFieldsAsyncInput,
  type UpdateFieldsInput,
  type UpdateFieldsInstruction,
  type UpdateFieldsInstructionData,
  type UpdateFieldsInstructionDataArgs,
} from "../generated/instructions/updateFields";

import {
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  isOption,
  isSome,
  none,
  some,
  transformDecoder,
  transformEncoder,
  type Codec,
  type Decoder,
  type Encoder,
  type OptionOrNullable,
  type Option,
} from "@solana/kit";
import {
  UPDATE_FIELDS_DISCRIMINATOR,
  getUpdateFieldsInstructionAsync as _getUpdateFieldsInstructionAsync,
  type UpdateFieldsAsyncInput,
  type UpdateFieldsInstruction,
  type UpdateFieldsInstructionData,
  type UpdateFieldsInstructionDataArgs,
} from "../generated/instructions/updateFields";
import { HEIRLOOM_PROGRAM_PROGRAM_ADDRESS } from "../generated/programs";
import type { Address } from "@solana/kit";

// ---------------------------------------------------------------------------
// OptionZc<i64> codec — always 9 bytes: 1 tag byte + 8 little-endian i64 bytes
// ---------------------------------------------------------------------------

function getOptionZcI64Encoder(): Encoder<OptionOrNullable<number | bigint>> {
  return transformEncoder(
    getStructEncoder([
      ["tag", getU8Encoder()],
      ["value", getI64Encoder()],
    ]),
    (v) => {
      // v can be: null | number | bigint | { __option: "Some", value } | { __option: "None" }
      if (isOption(v)) {
        return isSome(v)
          ? { tag: 1, value: BigInt(v.value) }
          : { tag: 0, value: 0n };
      }
      return v != null
        ? { tag: 1, value: BigInt(v) }
        : { tag: 0, value: 0n };
    },
  );
}

function getOptionZcI64Decoder(): Decoder<Option<bigint>> {
  return transformDecoder(
    getStructDecoder([
      ["tag", getU8Decoder()],
      ["value", getI64Decoder()],
    ]),
    ({ tag, value }) => (tag !== 0 ? some(value) : none<bigint>()),
  );
}

export function getUpdateFieldsInstructionDataEncoder(): Encoder<UpdateFieldsInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ["discriminator", fixEncoderSize(getBytesEncoder(), 1)],
      ["heartbeatInterval", getOptionZcI64Encoder()],
      ["gracePeriod", getOptionZcI64Encoder()],
      ["pauseDuration", getOptionZcI64Encoder()],
    ]),
    (value) => ({ ...value, discriminator: UPDATE_FIELDS_DISCRIMINATOR }),
  );
}

export function getUpdateFieldsInstructionDataDecoder(): Decoder<UpdateFieldsInstructionData> {
  return getStructDecoder([
    ["discriminator", fixDecoderSize(getBytesDecoder(), 1)],
    ["heartbeatInterval", getOptionZcI64Decoder()],
    ["gracePeriod", getOptionZcI64Decoder()],
    ["pauseDuration", getOptionZcI64Decoder()],
  ]);
}

export function getUpdateFieldsInstructionDataCodec(): Codec<
  UpdateFieldsInstructionDataArgs,
  UpdateFieldsInstructionData
> {
  return combineCodec(
    getUpdateFieldsInstructionDataEncoder(),
    getUpdateFieldsInstructionDataDecoder(),
  );
}

// ---------------------------------------------------------------------------
// Async instruction builder — same account resolution as generated, fixed codec
// ---------------------------------------------------------------------------

export async function getUpdateFieldsInstructionAsync<
  TAccountAuthority extends string,
  TAccountHeir extends string,
  TAccountEstate extends string,
  TAccountClock extends string,
  TProgramAddress extends Address = typeof HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
>(
  input: UpdateFieldsAsyncInput<
    TAccountAuthority,
    TAccountHeir,
    TAccountEstate,
    TAccountClock
  >,
  config?: { programAddress?: TProgramAddress },
): Promise<
  UpdateFieldsInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountHeir,
    TAccountEstate,
    TAccountClock
  >
> {
  const ix = await _getUpdateFieldsInstructionAsync(input, config);
  // Re-encode the data with the correct OptionZc layout.
  const data = getUpdateFieldsInstructionDataEncoder().encode(input as UpdateFieldsInstructionDataArgs);
  return { ...ix, data } as typeof ix;
}
