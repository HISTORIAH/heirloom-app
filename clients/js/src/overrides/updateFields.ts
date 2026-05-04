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
  parseUpdateFieldsInstruction,
  type ParsedUpdateFieldsInstruction,
  type UpdateFieldsInput,
  type UpdateFieldsInstruction,
  type UpdateFieldsInstructionData,
  type UpdateFieldsInstructionDataArgs,
} from "../generated/instructions/updateFields";

import {
  AccountRole,
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
  getUpdateFieldsInstruction as _getUpdateFieldsInstruction,
  type UpdateFieldsInput,
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

// ---------------------------------------------------------------------------
// OptionZc<PodString<32, 1>> codec — FIXED 34 bytes:
// 1 tag byte + 1 len byte + 32 content bytes (zero-padded)
// ---------------------------------------------------------------------------

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getOptionPodString32Encoder(): Encoder<OptionOrNullable<string>> {
  return transformEncoder(
    getStructEncoder([
      ["tag", getU8Encoder()],
      ["len", getU8Encoder()],
      ["content", fixEncoderSize(getBytesEncoder(), 32)],
    ]),
    (v) => {
      let str: string | null = null;
      if (isOption(v)) {
        str = isSome(v) ? String(v.value) : null;
      } else if (v != null) {
        str = String(v);
      }

      if (str == null) {
        return { tag: 0, len: 0, content: new Uint8Array(32) };
      }
      const bytes = textEncoder.encode(str);
      if (bytes.length > 32) {
        throw new Error("updateFields label exceeds 32 bytes");
      }
      const content = new Uint8Array(32);
      content.set(bytes);
      return { tag: 1, len: bytes.length, content };
    },
  );
}

function getOptionPodString32Decoder(): Decoder<Option<string>> {
  return transformDecoder(
    getStructDecoder([
      ["tag", getU8Decoder()],
      ["len", getU8Decoder()],
      ["content", fixDecoderSize(getBytesDecoder(), 32)],
    ]),
    ({ tag, len, content }) => {
      if (tag === 0) return none<string>();
      const str = textDecoder.decode(content.slice(0, len));
      return some(str);
    },
  );
}

// ---------------------------------------------------------------------------
// Fixed data encoder / decoder
// ---------------------------------------------------------------------------

export function getUpdateFieldsInstructionDataEncoder(): Encoder<UpdateFieldsInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ["discriminator", fixEncoderSize(getBytesEncoder(), 1)],
      ["heartbeatInterval", getOptionZcI64Encoder()],
      ["gracePeriod", getOptionZcI64Encoder()],
      ["pauseDuration", getOptionZcI64Encoder()],
      ["label", getOptionPodString32Encoder()],
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
    ["label", getOptionPodString32Decoder()],
  ]) as Decoder<UpdateFieldsInstructionData>;
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
// Sync instruction builder — same account resolution as generated, fixed codec
// ---------------------------------------------------------------------------

const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;

export function getUpdateFieldsInstruction<
  TAccountAuthority extends string,
  TAccountHeir extends string,
  TAccountEstate extends string,
  TAccountClock extends string,
  TProgramAddress extends Address = typeof HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
>(
  input: UpdateFieldsInput<
    TAccountAuthority,
    TAccountHeir,
    TAccountEstate,
    TAccountClock
  >,
  config?: { programAddress?: TProgramAddress },
): UpdateFieldsInstruction<
  TProgramAddress,
  TAccountAuthority,
  TAccountHeir,
  TAccountEstate,
  TAccountClock
> {
  const ix = _getUpdateFieldsInstruction(input, config);
  // Re-encode the data with the correct OptionZc + PodString layout.
  const data = getUpdateFieldsInstructionDataEncoder().encode(
    input as UpdateFieldsInstructionDataArgs,
  );
  // The program's realloc_account CPIs into the system program, but Quasar's
  // IDL generator omits Program<SystemProgram> accounts. Inject it manually.
  const accounts = [
    ...ix.accounts,
    { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
  ];
  return { ...ix, accounts, data } as UpdateFieldsInstruction<
    TProgramAddress,
    TAccountAuthority,
    TAccountHeir,
    TAccountEstate,
    TAccountClock
  >;
}

// Keep async alias for backward compatibility (no PDA resolution needed).
export async function getUpdateFieldsInstructionAsync<
  TAccountAuthority extends string,
  TAccountHeir extends string,
  TAccountEstate extends string,
  TAccountClock extends string,
  TProgramAddress extends Address = typeof HEIRLOOM_PROGRAM_PROGRAM_ADDRESS,
>(
  input: UpdateFieldsInput<
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
  return getUpdateFieldsInstruction(input, config);
}
