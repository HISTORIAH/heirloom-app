import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PROGRAM_ID, VAULT_SEED, USDC_MINT } from "@/config/constants";
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
  usdcMint: PublicKey,
  guardian?: string
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const vaultUsdc = getAssociatedTokenAddressSync(usdcMint, vault, true);

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
      tokenBMint: usdcMint,
      vaultTokenB: vaultUsdc,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function depositSol(
  provider: AnchorProvider,
  amount: number
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .depositSol(new BN(amount))
    .accounts({
      owner,
      vault,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function depositUsdc(
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
    .depositToken(new BN(amount))
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
  usdcMint: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const heir = provider.publicKey;
  const [vault] = getVaultPDA(vaultOwner);

  const vaultUsdc = getAssociatedTokenAddressSync(usdcMint, vault, true);
  const heirUsdc = getAssociatedTokenAddressSync(usdcMint, heir);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .claim()
    .accounts({
      heir,
      vaultOwner,
      vault,
      tokenBMint: usdcMint,
      vaultTokenB: vaultUsdc,
      heirTokenB: heirUsdc,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

export async function emergencyWithdraw(
  provider: AnchorProvider,
  usdcMint: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const owner = provider.publicKey;
  const [vault] = getVaultPDA(owner);

  const vaultUsdc = getAssociatedTokenAddressSync(usdcMint, vault, true);
  const ownerUsdc = getAssociatedTokenAddressSync(usdcMint, owner);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = program.methods as any;
  const tx: string = await methods
    .emergencyWithdraw()
    .accounts({
      owner,
      vault,
      tokenBMint: usdcMint,
      vaultTokenB: vaultUsdc,
      ownerTokenB: ownerUsdc,
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
  tokenBMint: PublicKey;
  heartbeatInterval: BN;
  gracePeriod: BN;
  lastHeartbeat: BN;
  solBalance: BN;
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
  solBalance: number;
  usdcBalance: number;
  splitBps: number;
  hasClaimed: boolean;
  solShare: number;
  usdcShare: number;
  usdcMint: string;
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

    const solBal = vault.solBalance.toNumber();
    const usdcBal = vault.tokenBBalance.toNumber();
    const splitBps = heirEntry.splitBps;

    return {
      ownerAddress,
      vaultState,
      solBalance: solBal,
      usdcBalance: usdcBal,
      splitBps,
      hasClaimed: heirEntry.hasClaimed,
      solShare: Math.floor((solBal * splitBps) / 10000),
      usdcShare: Math.floor((usdcBal * splitBps) / 10000),
      usdcMint: vault.tokenBMint.toBase58(),
    };
  } catch {
    return null;
  }
}
