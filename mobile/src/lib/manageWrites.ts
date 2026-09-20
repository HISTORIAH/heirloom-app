import {
  fetchMaybeAssetRecord,
  findAssetRecordPda,
  findEstatePda,
  findVaultPda,
  getRegisterAssetInstructionAsync,
  getRevokeInstructionAsync,
  getUpdateFieldInstruction,
  getUpdateHeirInstructionAsync,
  TREASURY_ADDRESS,
} from "@historiah/heirloom";
import {
  address,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

import { findAtaPda, TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from "@/lib/ata";
import { LABEL_MAX_LEN } from "@/lib/constants";
import type { EstateRow } from "@/lib/estates";
import {
  discoverVaultRegisteredTokens,
  registeredTokenCount,
  type EstateRpc,
} from "@/lib/heirWrites";
import { assertEstateFree } from "@/lib/ownerWrites";

function requireTokens(found: number, claimableAssets: number): void {
  const need = registeredTokenCount(claimableAssets);
  if (found < need) {
    throw new Error(
      "This vault still has tokens, but this RPC did not list them all. Try again later.",
    );
  }
}

export function isPausedNow(pausedUntil: bigint | number): boolean {
  const until = Number(pausedUntil);
  return until > 0 && until > Date.now() / 1000;
}

export function assertNotPaused(pausedUntil: bigint | number): void {
  if (isPausedNow(pausedUntil)) {
    throw new Error("This estate is paused. Wait until the pause ends.");
  }
}

export async function buildRevokeAllIxs(
  rpc: EstateRpc,
  authority: TransactionSigner,
  row: EstateRow,
): Promise<Instruction[]> {
  const heir = row.data.heir;
  const [vault] = await findVaultPda({
    authority: authority.address,
    heir,
  });
  const tokens = await discoverVaultRegisteredTokens(rpc, vault, row.address);
  requireTokens(tokens.length, row.data.claimableAssets);
  const tokenIxs = await Promise.all(
    tokens.map(async (tok) => {
      const [authorityTokenAccount, treasuryTokenAccount] = await Promise.all([
        findAtaPda(authority.address, tok.mint, tok.tokenProgram),
        findAtaPda(TREASURY_ADDRESS, tok.mint, tok.tokenProgram),
      ]);
      return getRevokeInstructionAsync({
        authority,
        heir,
        estate: row.address,
        vault,
        treasury: TREASURY_ADDRESS,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        authorityTokenAccount,
        treasuryTokenAccount,
        assetRecord: tok.assetRecord,
      });
    }),
  );
  const solIx = await getRevokeInstructionAsync({
    authority,
    heir,
    estate: row.address,
    vault,
    treasury: TREASURY_ADDRESS,
  });
  return [...tokenIxs, solIx];
}

export async function buildReassignIxs(
  rpc: EstateRpc,
  authority: TransactionSigner,
  row: EstateRow,
  newHeir: Address,
): Promise<Instruction[]> {
  if (newHeir === row.data.heir) {
    throw new Error("That address is already the heir.");
  }
  assertNotPaused(row.data.pausedUntil);
  await assertEstateFree(rpc, authority.address, newHeir);
  const heir = row.data.heir;
  const [[estate], [vault], [newEstate], [newVault]] = await Promise.all([
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
    findEstatePda({ authority: authority.address, heir: newHeir }),
    findVaultPda({ authority: authority.address, heir: newHeir }),
  ]);
  const tokens = await discoverVaultRegisteredTokens(rpc, vault, estate);
  requireTokens(tokens.length, row.data.claimableAssets);
  const tokenIxs = await Promise.all(
    tokens.map(async (tok) => {
      const [newVaultTokenAccount, newAssetRecord] = await Promise.all([
        findAtaPda(newVault, tok.mint, tok.tokenProgram),
        findAssetRecordPda({ estate: newEstate, mint: tok.mint }),
      ]);
      return getUpdateHeirInstructionAsync({
        authority,
        heir,
        newHeir,
        estate,
        vault,
        newEstate,
        newVault,
        mint: tok.mint,
        tokenProgram: tok.tokenProgram,
        vaultTokenAccount: tok.vaultTokenAccount,
        newVaultTokenAccount,
        assetRecord: tok.assetRecord,
        newAssetRecord: newAssetRecord[0],
      });
    }),
  );
  const finalIx = await getUpdateHeirInstructionAsync({
    authority,
    heir,
    newHeir,
    estate,
    vault,
    newEstate,
    newVault,
  });
  return [...tokenIxs, finalIx];
}

export function buildSettingsIx(
  authority: TransactionSigner,
  heir: Address,
  estate: Address,
  fields: {
    heartbeatInterval?: bigint;
    gracePeriod?: bigint;
    pauseDuration?: bigint;
    label?: string;
  },
): Instruction {
  return getUpdateFieldInstruction({
    authority,
    heir,
    estate,
    heartbeatInterval: fields.heartbeatInterval ?? null,
    gracePeriod: fields.gracePeriod ?? null,
    pauseDuration: fields.pauseDuration ?? null,
    label: fields.label ?? null,
  });
}

export function trimmedLabel(label: string): string {
  const next = label.trim();
  if (next.length === 0) throw new Error("Enter a label");
  if (next.length > LABEL_MAX_LEN) {
    throw new Error(`Label max is ${LABEL_MAX_LEN} characters`);
  }
  return next;
}

export async function fetchMintMeta(
  rpc: EstateRpc,
  mint: Address,
): Promise<{ decimals: number; tokenProgram: Address }> {
  const { value } = await rpc
    .getAccountInfo(mint, { encoding: "jsonParsed" })
    .send();
  if (!value) throw new Error("Mint not found");
  const tokenProgram = address(String(value.owner));
  if (
    tokenProgram !== TOKEN_PROGRAM_ADDRESS &&
    tokenProgram !== TOKEN_2022_PROGRAM_ADDRESS
  ) {
    throw new Error("That address is not an SPL mint");
  }
  const data: unknown = value.data;
  const payload = Array.isArray(data) ? data[0] : data;
  const parsed =
    typeof payload === "object" && payload !== null && "parsed" in payload
      ? (payload as { parsed?: { info?: { decimals?: number } } }).parsed
      : undefined;
  const decimals = parsed?.info?.decimals;
  if (typeof decimals !== "number") throw new Error("Could not read mint decimals");
  return { decimals, tokenProgram };
}

export async function assertMintUnregistered(
  rpc: EstateRpc,
  estate: Address,
  mint: Address,
): Promise<void> {
  const [assetRecord] = await findAssetRecordPda({ estate, mint });
  const maybe = await fetchMaybeAssetRecord(rpc, assetRecord);
  if (maybe.exists) {
    throw new Error(
      "This mint is already in the vault. This screen only registers a new mint.",
    );
  }
}

export async function assertWalletCanDeposit(
  rpc: EstateRpc,
  owner: Address,
  mint: Address,
  tokenProgram: Address,
  amount: bigint,
): Promise<void> {
  const ata = await findAtaPda(owner, mint, tokenProgram);
  const { value } = await rpc
    .getAccountInfo(ata, { encoding: "jsonParsed" })
    .send();
  if (!value) {
    throw new Error("This wallet has no token account for that mint.");
  }
  const data: unknown = value.data;
  const payload = Array.isArray(data) ? data[0] : data;
  const parsed =
    typeof payload === "object" && payload !== null && "parsed" in payload
      ? (payload as {
          parsed?: { info?: { tokenAmount?: { amount?: string } } };
        }).parsed
      : undefined;
  const raw = parsed?.info?.tokenAmount?.amount;
  if (typeof raw !== "string") {
    throw new Error("Could not read this wallet's token balance.");
  }
  let have: bigint;
  try {
    have = BigInt(raw);
  } catch {
    throw new Error("Could not read this wallet's token balance.");
  }
  if (have < amount) {
    throw new Error("This wallet does not have that much of this token.");
  }
}

export async function buildRegisterTokenIx(
  rpc: EstateRpc,
  authority: TransactionSigner,
  heir: Address,
  mint: Address,
  amount: bigint,
): Promise<Instruction> {
  if (amount <= 0n) throw new Error("Enter an amount greater than zero");
  const [{ tokenProgram }, [estate], [vault]] = await Promise.all([
    fetchMintMeta(rpc, mint),
    findEstatePda({ authority: authority.address, heir }),
    findVaultPda({ authority: authority.address, heir }),
  ]);
  await assertMintUnregistered(rpc, estate, mint);
  await assertWalletCanDeposit(
    rpc,
    authority.address,
    mint,
    tokenProgram,
    amount,
  );
  const [vaultTokenAccount, authorityTokenAccount, [assetRecord]] =
    await Promise.all([
      findAtaPda(vault, mint, tokenProgram),
      findAtaPda(authority.address, mint, tokenProgram),
      findAssetRecordPda({ estate, mint }),
    ]);
  return getRegisterAssetInstructionAsync({
    authority,
    heir,
    estate,
    vault,
    mint,
    amount,
    tokenProgram,
    vaultTokenAccount,
    authorityTokenAccount,
    assetRecord,
  });
}
