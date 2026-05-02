import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  sendClaim,
  createAndMintTokens,
  loadDefaultKeypair,
  createDevnetSolanaClient,
} from "./setup";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { findEstatePda, findVaultPda } from "@historiah/heirloom";
import { generateKeyPairSigner } from "@solana/kit";

test("it claims a native SOL vault", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(100_000),
    label: "test-claim-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  let [vault] = await findVaultPda({ authority: authority.address, heir: heir.address });
  let [estate] = await findEstatePda({ authority: authority.address, heir: heir.address });

  await sendClaim(client, { heir, vault, estate });
});

test("it claims a token vault", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const { mint } = await createAndMintTokens();
  const heir = await generateKeyPairSigner();

  let [vault] = await findVaultPda({ authority: authority.address, heir: heir.address });
  let [estate] = await findEstatePda({ authority: authority.address, heir: heir.address });

  const [vaultTokenAccount] = await findAssociatedTokenPda(
    {
      owner: vault,
      tokenProgram: TOKEN_PROGRAM_ADDRESS, // because the plugins only support og token acc
      mint: mint.address
    }
  );
  const [authorityTokenAccount] = await findAssociatedTokenPda(
    {
      owner: authority.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS, // because the plugins only support og token acc
      mint: mint.address
    }
  );
  const [heirTokenAccount] = await findAssociatedTokenPda(
    {
      owner: heir.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS, // because the plugins only support og token acc
      mint: mint.address
    }
  );

await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-migration-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    heir,
    authorityTokenAccount,
  });

  await sendClaim(client, {
    heir,
    mint: mint.address,
    vaultTokenAccount,
    heirTokenAccount,
    vault,
    estate,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
});
