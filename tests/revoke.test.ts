import { test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createAndMintTokens,
  createHeir,
  sendInitialize,
  sendRevoke,
  sendUpdateHeir,
  deriveEstateVault,
  deriveTokenAccounts,
} from "./setup";

test("it creates a token-only vault and revokes it", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(
    authority.address,
    heir.address,
  );
  const { vaultTokenAccount, authorityTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  await sendInitialize(client, {
    heir,
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

  await sendRevoke(client, {
    heir: heir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount
  });
});

test("it creates a token-only vault, updates heir and revokes it", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const newHeir = await generateKeyPairSigner();
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(
    authority.address,
    heir.address,
  );
  const { vaultTokenAccount, authorityTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  const { vaultTokenAccount: newVaultTokenAccount } =
    await deriveTokenAccounts(
      (await deriveEstateVault(authority.address, newHeir.address)).vault,
      authority.address,
      newHeir.address,
      mint.address,
    );

  await sendInitialize(client, {
    heir,
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

  await sendUpdateHeir(client, {
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    newHeir: newHeir.address,
    oldHeir: heir.address,
    vaultTokenAccount,
  });

  await sendRevoke(client, {
    heir: newHeir.address,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount: newVaultTokenAccount,
    authorityTokenAccount,
    treasuryTokenAccount
  });
});
