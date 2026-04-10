import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PROGRAM_ID, VAULT_SEED } from "@/config/constants";
import idl from "./idl.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type HeirloomProgram = Program<any>;

export function getProgram(provider: AnchorProvider): HeirloomProgram {
  return new Program(idl as any, provider);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function getVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer()],
    PROGRAM_ID
  );
}

// ---- WRITE FUNCTIONS ----

export async function createVault(
  provider: AnchorProvider,
  heartbeatInterval: number,
  gracePeriod: number,
  heirs: { address: string; splitBps: number }[],
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  guardian?: string
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const vaultTokenA = getAssociatedTokenAddressSync(tokenAMint, vault, true);
  const vaultTokenB = getAssociatedTokenAddressSync(tokenBMint, vault, true);

  const heirInputs = heirs.map((h) => ({
    heir: new PublicKey(h.address),
    splitBps: h.splitBps,
  }));

  const guardianPubkey = guardian ? new PublicKey(guardian) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .createVault(
      new BN(heartbeatInterval),
      new BN(gracePeriod),
      heirInputs,
      guardianPubkey
    )
    .accounts({
      owner,
      vault,
      tokenAMint,
      tokenBMint,
      vaultTokenA,
      vaultTokenB,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function deposit(
  provider: AnchorProvider,
  mint: PublicKey,
  amount: number
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const ownerTokenAccount = getAssociatedTokenAddressSync(mint, owner);
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vault, true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .deposit(new BN(amount))
    .accounts({
      owner,
      vault,
      mint,
      ownerTokenAccount,
      vaultTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function sendHeartbeat(provider: AnchorProvider): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .heartbeat()
    .accounts({ owner, vault })
    .rpc();

  return tx;
}

export async function claimInheritance(
  provider: AnchorProvider,
  vaultOwner: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const heir = provider.publicKey;
  const [vault] = getVaultPDA(vaultOwner);

  const vaultTokenA = getAssociatedTokenAddressSync(tokenAMint, vault, true);
  const vaultTokenB = getAssociatedTokenAddressSync(tokenBMint, vault, true);
  const heirTokenA = getAssociatedTokenAddressSync(tokenAMint, heir);
  const heirTokenB = getAssociatedTokenAddressSync(tokenBMint, heir);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .claim()
    .accounts({
      heir,
      vaultOwner,
      vault,
      tokenAMint,
      tokenBMint,
      vaultTokenA,
      vaultTokenB,
      heirTokenA,
      heirTokenB,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function emergencyWithdraw(
  provider: AnchorProvider,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const vaultTokenA = getAssociatedTokenAddressSync(tokenAMint, vault, true);
  const vaultTokenB = getAssociatedTokenAddressSync(tokenBMint, vault, true);
  const ownerTokenA = getAssociatedTokenAddressSync(tokenAMint, owner);
  const ownerTokenB = getAssociatedTokenAddressSync(tokenBMint, owner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .emergencyWithdraw()
    .accounts({
      owner,
      vault,
      tokenAMint,
      tokenBMint,
      vaultTokenA,
      vaultTokenB,
      ownerTokenA,
      ownerTokenB,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function guardianPause(
  provider: AnchorProvider,
  vaultOwner: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [vault] = getVaultPDA(vaultOwner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .guardianPause()
    .accounts({
      guardian: provider.publicKey,
      vaultOwner,
      vault,
    })
    .rpc();

  return tx;
}

export async function updateHeirs(
  provider: AnchorProvider,
  newHeirs: { address: string; splitBps: number }[]
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const heirInputs = newHeirs.map((h) => ({
    heir: new PublicKey(h.address),
    splitBps: h.splitBps,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .updateHeirs(heirInputs)
    .accounts({ owner, vault })
    .rpc();

  return tx;
}

// ---- READ FUNCTIONS ----

export interface VaultAccount {
  owner: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  heartbeatInterval: BN;
  gracePeriod: BN;
  lastHeartbeat: BN;
  tokenABalance: BN;
  tokenBBalance: BN;
  guardian: PublicKey | null;
  guardianPauseUsed: boolean;
  isDistributed: boolean;
  createdAt: BN;
  heirCount: number;
  claimsCount: number;
  bump: number;
  heirs: {
    heir: PublicKey;
    splitBps: number;
    hasClaimed: boolean;
    isActive: boolean;
  }[];
}

export async function fetchVaultAccount(
  connection: Connection,
  owner: PublicKey
): Promise<VaultAccount | null> {
  try {
    const provider = new AnchorProvider(
      connection,
      { publicKey: owner, signTransaction: async <T>(t: T) => t, signAllTransactions: async <T>(t: T) => t } as never,
      { commitment: "confirmed" }
    );
    const program = getProgram(provider);
    const [vaultPDA] = getVaultPDA(owner);
    const vault = await (program.account as Record<string, { fetch: (addr: PublicKey) => Promise<unknown> }>)["vault"].fetch(vaultPDA);
    return vault as unknown as VaultAccount;
  } catch {
    return null;
  }
}

export async function lookupSingleVault(
  connection: Connection,
  ownerAddress: string,
  heirAddress: string
): Promise<{
  ownerAddress: string;
  vaultState: string;
  tokenABalance: number;
  tokenBBalance: number;
  splitBps: number;
  hasClaimed: boolean;
  tokenAShare: number;
  tokenBShare: number;
  tokenAMint: string;
  tokenBMint: string;
} | null> {
  try {
    const ownerPk = new PublicKey(ownerAddress);
    const heirPk = new PublicKey(heirAddress);

    if (ownerPk.equals(heirPk)) return null;

    const vault = await fetchVaultAccount(connection, ownerPk);
    if (!vault) return null;

    const heirEntry = vault.heirs.find(
      (h) => h.isActive && h.heir.equals(heirPk)
    );
    if (!heirEntry) return null;

    const now = Math.floor(Date.now() / 1000);
    const lastHB = vault.lastHeartbeat.toNumber();
    const interval = vault.heartbeatInterval.toNumber();
    const grace = vault.gracePeriod.toNumber();
    const pauseBonus = vault.guardianPauseUsed ? 2592000 : 0;
    const elapsed = now - lastHB;
    const deadline = interval + grace + pauseBonus;

    let vaultState: string;
    if (vault.isDistributed) {
      vaultState = "distributed";
    } else if (elapsed >= deadline) {
      vaultState = "claimable";
    } else if (elapsed >= interval) {
      vaultState = "grace";
    } else {
      vaultState = "active";
    }

    if (vault.isDistributed && heirEntry.hasClaimed) return null;

    const tokenABal = vault.tokenABalance.toNumber();
    const tokenBBal = vault.tokenBBalance.toNumber();
    const splitBps = heirEntry.splitBps;

    return {
      ownerAddress,
      vaultState,
      tokenABalance: tokenABal,
      tokenBBalance: tokenBBal,
      splitBps,
      hasClaimed: heirEntry.hasClaimed,
      tokenAShare: Math.floor((tokenABal * splitBps) / 10000),
      tokenBShare: Math.floor((tokenBBal * splitBps) / 10000),
      tokenAMint: vault.tokenAMint.toBase58(),
      tokenBMint: vault.tokenBMint.toBase58(),
    };
  } catch {
    return null;
  }
}
