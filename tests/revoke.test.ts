import { test } from "bun:test";
import {
  generateKeyPairSigner,
  lamports,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  findVaultPda,
} from "@historiah/heirloom";
import {
  createDefaultSolanaClient,
  createAndMintTokens,
  loadDefaultKeypair,
  sendInitialize,
  sendRevoke,
} from "./setup";


test("it creates a token-only vault and revokes it", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const heir = await generateKeyPairSigner();
  const { mint } = await createAndMintTokens();

  await client.rpc.requestAirdrop(heir.address, lamports(10_000_000n)).send();

  const [vaultPda] = await findVaultPda({
    authority: authority.address,
    heir: heir.address,
  });

  const [vaultTokenAccount] = await findAssociatedTokenPda({
    owner: vaultPda,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const [authorityTokenAccount] = await findAssociatedTokenPda({
    owner: authority.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // Init with token as the sole primary asset — no SOL deposit
  await sendInitialize(client, {
    heir ,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-token-only-revoke",
    amount: 500_000n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });

  // Revoke token — claimable_assets drops to 0 so program closes estate + vault
  await sendRevoke(client, {
    heir: heir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });
});
