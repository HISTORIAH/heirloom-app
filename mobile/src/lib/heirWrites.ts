import {
  fetchMaybeAssetRecord,
  findAssetRecordPda,
  findEstatePda,
  findVaultPda,
  getClaimInstructionAsync,
  getUpdateFieldInstruction,
  TREASURY_ADDRESS,
  type Estate,
} from "@historiah/heirloom";
import {
  address,
  type Address,
  type Instruction,
  type Rpc,
  type SolanaRpcApi,
  type TransactionSigner,
} from "@solana/kit";

import { findAtaPda, tokenProgramList } from "@/lib/ata";
import { unwrapOption } from "@/lib/option";

export type EstateRpc = Rpc<SolanaRpcApi>;

export type ClaimToken = {
  mint: Address;
  vaultTokenAccount: Address;
  heirTokenAccount: Address;
  treasuryTokenAccount: Address;
  tokenProgram: Address;
  assetRecord: Address;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === undefined || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function parsedMintAndAmount(
  data: unknown,
): { mint: string; amount: string } | undefined {
  const payload = Array.isArray(data) ? data[0] : data;
  const info = asRecord(asRecord(payload)?.parsed)?.info;
  const rec = asRecord(info);
  if (rec === undefined) return undefined;
  const mint = rec.mint;
  const amount = asRecord(rec.tokenAmount)?.amount;
  if (typeof mint !== "string" || typeof amount !== "string") return undefined;
  return { mint, amount };
}

function ownerProgram(owner: unknown): Address | undefined {
  if (typeof owner !== "string" || owner.length === 0) return undefined;
  try {
    return address(owner);
  } catch {
    return undefined;
  }
}

async function maybeClaimToken(
  rpc: EstateRpc,
  vaultAccount: { pubkey: Address; account: { data: unknown; owner: Address } },
  estate: Address,
  heir: Address,
): Promise<ClaimToken | undefined> {
  const parsed = parsedMintAndAmount(vaultAccount.account.data);
  const tokenProgram = ownerProgram(vaultAccount.account.owner);
  if (parsed === undefined || tokenProgram === undefined) return undefined;
  let mint: Address;
  try {
    mint = address(parsed.mint);
  } catch {
    return undefined;
  }
  const [assetRecord] = await findAssetRecordPda({ estate, mint });
  const maybe = await fetchMaybeAssetRecord(rpc, assetRecord);
  if (!maybe.exists) return undefined;
  if (maybe.data.hasProtectedExposure || maybe.data.hasBoostedExposure) {
    throw new Error(
      "This vault still has yield deployed. Recall it on the web app before claiming.",
    );
  }
  let amount: bigint;
  try {
    amount = BigInt(parsed.amount);
  } catch {
    return undefined;
  }
  if (amount <= 0n) return undefined;
  const [heirTokenAccount, treasuryTokenAccount] = await Promise.all([
    findAtaPda(heir, mint, tokenProgram),
    findAtaPda(TREASURY_ADDRESS, mint, tokenProgram),
  ]);
  return {
    mint,
    vaultTokenAccount: vaultAccount.pubkey,
    heirTokenAccount,
    treasuryTokenAccount,
    tokenProgram,
    assetRecord,
  };
}

export function registeredTokenCount(claimableAssets: number): number {
  if (claimableAssets <= 1) return 0;
  return claimableAssets - 1;
}

export function estateDelegate(estate: Estate): Address | undefined {
  const raw = unwrapOption(estate.delegate);
  if (raw === null || raw.length === 0) return undefined;
  return address(raw);
}

export async function discoverVaultClaimTokens(
  rpc: EstateRpc,
  vault: Address,
  estate: Address,
  heir: Address,
): Promise<ClaimToken[]> {
  const groups = await Promise.all(
    tokenProgramList().map((programId) =>
      rpc
        .getTokenAccountsByOwner(
          vault,
          { programId },
          { encoding: "jsonParsed" },
        )
        .send(),
    ),
  );

  const found: ClaimToken[] = [];
  for (const group of groups) {
    for (const item of group.value) {
      const tok = await maybeClaimToken(rpc, item, estate, heir);
      if (tok !== undefined) found.push(tok);
    }
  }
  return found;
}

export async function buildClaimIxs(
  heir: TransactionSigner,
  input: {
    authority: Address;
    estate: Address;
    vault: Address;
    tokens: ClaimToken[];
    delegate?: Address;
  },
): Promise<Instruction[]> {
  const tokenIxs = await Promise.all(
    input.tokens.map((tok) =>
      getClaimInstructionAsync({
        heir,
        authority: input.authority,
        estate: input.estate,
        vault: input.vault,
        treasury: TREASURY_ADDRESS,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        heirTokenAccount: tok.heirTokenAccount,
        treasuryTokenAccount: tok.treasuryTokenAccount,
        assetRecord: tok.assetRecord,
        delegate: input.delegate,
      }),
    ),
  );
  const solIx = await getClaimInstructionAsync({
    heir,
    authority: input.authority,
    estate: input.estate,
    vault: input.vault,
    treasury: TREASURY_ADDRESS,
    delegate: input.delegate,
  });
  return [...tokenIxs, solIx];
}

export async function buildSignerHeartbeatIx(
  signer: TransactionSigner,
  estateAuthority: Address,
  heir: Address,
): Promise<Instruction> {
  const [estate] = await findEstatePda({ authority: estateAuthority, heir });
  return getUpdateFieldInstruction({
    authority: signer,
    heir,
    estate,
    heartbeatInterval: null,
    gracePeriod: null,
    pauseDuration: null,
    label: null,
  });
}

export { findVaultPda };
