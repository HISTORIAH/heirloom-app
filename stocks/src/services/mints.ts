import {
  fetchEncodedAccounts,
  unwrapOption,
  type Address,
  type GetMultipleAccountsApi,
  type Rpc,
} from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  AccountState,
  decodeMint,
  TOKEN_2022_PROGRAM_ADDRESS,
  type Mint,
} from "@solana-program/token-2022";
import type { StockAsset } from "@/lib/stocks";

/**
 * Everything the app reads off a mint: the parts instruction builders need,
 * plus the Token-2022 configuration that decides risk, coverage health, and
 * the dividend schedule.
 */
export interface MintDetails extends StockAsset {
  freezeAuthority: Address | null;
  /** From the mint's own Token-2022 metadata, when it carries any. */
  name: string | null;
  symbol: string | null;
  /** Can move tokens out of any holder's account without their signature. */
  permanentDelegate: Address | null;
  pausable: { paused: boolean } | null;
  /** Present when the hook slot is allocated. `programId` stays null while unwired. */
  transferHook: { authority: Address | null; programId: Address | null } | null;
  /** How dividends and splits are applied: a display multiplier over raw units. */
  scaledUiAmount: {
    multiplier: number;
    newMultiplier: number;
    newMultiplierEffectiveTimestamp: number;
  } | null;
  frozenByDefault: boolean;
  nonTransferable: boolean;
}

/** Token-2022 stores "unset" in fixed-size address fields as all zeroes. */
const UNSET_ADDRESS = "11111111111111111111111111111111";

function setAddress(value: Address | null | undefined): Address | null {
  return value && value !== UNSET_ADDRESS ? value : null;
}

export function mintDetailsFrom(address: Address, tokenProgram: Address, mint: Mint): MintDetails {
  const details: MintDetails = {
    mint: address,
    tokenProgram,
    decimals: mint.decimals,
    mintAuthority: unwrapOption(mint.mintAuthority),
    freezeAuthority: unwrapOption(mint.freezeAuthority),
    name: null,
    symbol: null,
    permanentDelegate: null,
    pausable: null,
    transferHook: null,
    scaledUiAmount: null,
    frozenByDefault: false,
    nonTransferable: false,
  };

  for (const extension of unwrapOption(mint.extensions) ?? []) {
    switch (extension.__kind) {
      case "TokenMetadata":
        details.name = extension.name.trim() || null;
        details.symbol = extension.symbol.trim() || null;
        break;
      case "PermanentDelegate":
        details.permanentDelegate = setAddress(extension.delegate);
        break;
      case "PausableConfig":
        details.pausable = { paused: extension.paused };
        break;
      case "TransferHook":
        details.transferHook = {
          authority: setAddress(extension.authority),
          programId: setAddress(extension.programId),
        };
        break;
      case "ScaledUiAmountConfig":
        details.scaledUiAmount = {
          multiplier: extension.multiplier,
          newMultiplier: extension.newMultiplier,
          newMultiplierEffectiveTimestamp: Number(extension.newMultiplierEffectiveTimestamp),
        };
        break;
      case "DefaultAccountState":
        details.frozenByDefault = extension.state === AccountState.Frozen;
        break;
      case "NonTransferable":
        details.nonTransferable = true;
        break;
    }
  }

  return details;
}

/** `getMultipleAccounts` takes at most 100 keys per call. */
export const MULTIPLE_ACCOUNTS_LIMIT = 100;

export function chunk<T>(items: T[], size = MULTIPLE_ACCOUNTS_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Reads and decodes mints in batches. Accounts that aren't token mints are skipped. */
export async function fetchMintDetails(
  rpc: Rpc<GetMultipleAccountsApi>,
  mints: Address[],
): Promise<Map<Address, MintDetails>> {
  const details = new Map<Address, MintDetails>();

  for (const batch of chunk([...new Set(mints)])) {
    const accounts = await fetchEncodedAccounts(rpc, batch, { commitment: "confirmed" });
    for (const account of accounts) {
      if (!account.exists) continue;
      const owner = account.programAddress;
      if (owner !== TOKEN_PROGRAM_ADDRESS && owner !== TOKEN_2022_PROGRAM_ADDRESS) continue;
      try {
        details.set(
          account.address,
          mintDetailsFrom(account.address, owner, decodeMint(account).data),
        );
      } catch {
        // A token account or other non-mint owned by a token program.
      }
    }
  }

  return details;
}
