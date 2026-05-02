import { test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  getInitializeInstructionAsync,
  getRegisterAssetInstructionAsync,
} from "@historiah/heirloom";
import {
  createTestContext,
  createHeir,
  createAndMintTokens,
  sendInitialize,
  sendRevoke,
  sendRegisterAsset,
  deriveEstateVault,
  deriveTokenAccounts,
  sendInstructions,
} from "./setup";

test("it bundles init and register token in one transaction", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(
    authority.address,
    heir.address,
  );
  const { vaultTokenAccount, authorityTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

  const initIx = await getInitializeInstructionAsync({
    authority,
    heir: heir.address,
    heartbeatInterval: 0n,
    vault,
    estate,
    mint: mint.address,
    vaultTokenAccount,
    authorityTokenAccount,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-register",
    amount: 100_000n,
  });

  const { mint: newMint } = await createAndMintTokens();
  const { vaultTokenAccount: newVaultTokenAccount, authorityTokenAccount: newAuthorityTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, newMint.address);

  const registerIx = await getRegisterAssetInstructionAsync({
    authority,
    heir: heir.address,
    mint: newMint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    amount: 1_000_000,
    vaultTokenAccount: newVaultTokenAccount,
    vault,
    estate,
    authorityTokenAccount: newAuthorityTokenAccount,
  });

  await sendInstructions(client, authority, [initIx, registerIx]);
});

test("it creates a token-only vault and revokes it", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault, estate } = await deriveEstateVault(
    authority.address,
    heir.address,
  );
  const { vaultTokenAccount, authorityTokenAccount } =
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
  });
});

test("it inits with a token then registers a SOL asset separately", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vaultTokenAccount, authorityTokenAccount } =
    await deriveTokenAccounts(
      (await deriveEstateVault(authority.address, heir.address)).vault,
      authority.address,
      heir.address,
      mint.address,
    );

  await sendInitialize(client, {
    heir,
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
    label: "test-init-with-token",
    amount: 100_000n,
    mint: mint.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    vaultTokenAccount,
    authorityTokenAccount,
  });

  await sendRegisterAsset(client, {
    heir: heir.address,
    amount: 5_000_000_000n,
  });
});
