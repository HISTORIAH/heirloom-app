/**
 * Override for the codama-generated Estate account codec.
 *
 * The generated decoder uses getOptionDecoder which encodes None as a single
 * 0x00 byte. Quasar's OptionZc<Address> is always 33 bytes (1 tag + 32-byte
 * address), so when delegate=None and hb_signer=Some, the variable-size codec
 * mis-aligns and decodes hb_signer as None, claimable_assets as 0, and label
 * as "". We replace the decoder here and re-export everything else from
 * generated.
 *
 * Import from this file instead of the generated one.
 */

export {
  ESTATE_DISCRIMINATOR,
  getEstateDiscriminatorBytes,
  getEstateEncoder,
  type Estate,
  type EstateArgs,
} from "../generated/accounts/estate";

import {
  addDecoderSizePrefix,
  assertAccountExists,
  assertAccountsExist,
  combineCodec,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  fixDecoderSize,
  getAddressDecoder,
  getBooleanDecoder,
  getBytesDecoder,
  getI64Decoder,
  getStructDecoder,
  getU8Decoder,
  getUtf8Decoder,
  none,
  some,
  transformDecoder,
  type Account,
  type Address,
  type Codec,
  type Decoder,
  type EncodedAccount,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type MaybeAccount,
  type MaybeEncodedAccount,
  type Option,
} from "@solana/kit";
import {
  getEstateEncoder,
  type Estate,
  type EstateArgs,
} from "../generated/accounts/estate";

// ---------------------------------------------------------------------------
// OptionZc<Address> codec — always 33 bytes: 1 tag byte + 32-byte address.
// On-chain layout matches Quasar's OptionZc<T> ZC companion (fixed-size).
// ---------------------------------------------------------------------------

function getOptionZcAddressDecoder(): Decoder<Option<Address>> {
  return transformDecoder(
    getStructDecoder([
      ["tag", getU8Decoder()],
      ["value", fixDecoderSize(getAddressDecoder(), 32)],
    ]),
    ({ tag, value }) => (tag !== 0 ? some(value) : none<Address>()),
  );
}

// ---------------------------------------------------------------------------
// Estate decoder — matches the on-chain Quasar layout exactly.
// label is a dynamic String<32, 1>: 1-byte length prefix + active bytes only.
// ---------------------------------------------------------------------------

export function getEstateDecoder(): Decoder<Estate> {
  return getStructDecoder([
    ["discriminator", fixDecoderSize(getBytesDecoder(), 1)],
    ["authority", getAddressDecoder()],
    ["heir", getAddressDecoder()],
    ["heartbeatInterval", getI64Decoder()],
    ["gracePeriod", getI64Decoder()],
    ["lastHeartbeat", getI64Decoder()],
    ["createdAt", getI64Decoder()],
    ["bump", getU8Decoder()],
    ["isClaimed", getBooleanDecoder()],
    ["pauseDuration", getI64Decoder()],
    ["pausedUntil", getI64Decoder()],
    ["isDeferred", getBooleanDecoder()],
    ["delegate", getOptionZcAddressDecoder()],
    ["hbSigner", getOptionZcAddressDecoder()],
    ["claimableAssets", getU8Decoder()],
    ["label", addDecoderSizePrefix(getUtf8Decoder(), getU8Decoder())],
  ]) as Decoder<Estate>;
}

export function getEstateCodec(): Codec<EstateArgs, Estate> {
  return combineCodec(getEstateEncoder(), getEstateDecoder());
}

export function decodeEstate<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>,
): Account<Estate, TAddress>;
export function decodeEstate<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>,
): MaybeAccount<Estate, TAddress>;
export function decodeEstate<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>,
): Account<Estate, TAddress> | MaybeAccount<Estate, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getEstateDecoder(),
  );
}

export async function fetchEstate<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig,
): Promise<Account<Estate, TAddress>> {
  const maybeAccount = await fetchMaybeEstate(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeEstate<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig,
): Promise<MaybeAccount<Estate, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeEstate(maybeAccount);
}

export async function fetchAllEstate(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig,
): Promise<Account<Estate>[]> {
  const maybeAccounts = await fetchAllMaybeEstate(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeEstate(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig,
): Promise<MaybeAccount<Estate>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeEstate(maybeAccount));
}
