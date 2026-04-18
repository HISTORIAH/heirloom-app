import { expect, test } from "bun:test";
import {
  createDefaultSolanaClient,
  sendInitialize,
  sendUpdateHeir,
  createAndMintTokens,
  loadDefaultKeypair,
} from "./setup";
import { generateKeyPairSigner } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { findVaultPda } from "@historiah/heirloom";

test("it migrates sol vault to a new heir", async () => {
  const client = createDefaultSolanaClient();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000),
    label: "test-heir",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const newHeir = await generateKeyPairSigner();

  const { authority } = await sendUpdateHeir(client, {
    newHeir: newHeir.address,
    oldHeir: heir.address,
  });

  expect(newHeir.address).toBeTruthy();
});

test("it migrates token vault to a new heir", async () => {
  const client = createDefaultSolanaClient();
  const authority = await loadDefaultKeypair();
  const oldHeir = await generateKeyPairSigner();
  const newHeir = await generateKeyPairSigner();

  const { mint } = await createAndMintTokens();


  let [oldVault] = await findVaultPda({
    authority: authority.address,
    heir: oldHeir.address
  });
  const [oldVaultTokenAccount] = await findAssociatedTokenPda(
    {
      owner: oldVault,
      tokenProgram: TOKEN_PROGRAM_ADDRESS, // because the plugins only support og token acc
      mint: mint.address
    }
  );
  const [authorityTokenAcc] = await findAssociatedTokenPda(
    {
      owner: authority.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS, // because the plugins only support og token acc
      mint: mint.address
    }
  );

  await sendInitialize(client, {
    amount: 1_000_000n,
    label: "test-heir-token",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    mint: mint.address,
    heir: oldHeir,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: oldVaultTokenAccount,
    authorityTokenAccount: authorityTokenAcc
   });


  await sendUpdateHeir(client, {
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: oldHeir.address,
    vaultTokenAccount: oldVaultTokenAccount,
  });
});
