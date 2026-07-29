import { expect, test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createHeir,
  createAndMintTokens,
  deriveEstateVault,
  deriveTokenAccounts,
  getEstate,
  getLamportBalance,
  sendInitialize,
} from "./setup";

test("sanity check: test runner and dependencies are working", () => {
  expect(2 + 2).toBe(4);
});

test("it initializes a native SOL vault", async () => {
  const { client, authority } = await createTestContext();
  const heir = await generateKeyPairSigner();

  await sendInitialize(client, {
    heir,
    amount: BigInt(1_000_000_000),
    label: "test-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  const { estate, vault } = await deriveEstateVault(authority.address, heir.address);
  const [account, vaultBalance] = await Promise.all([
    getEstate(client, estate),
    getLamportBalance(client, vault),
  ]);

  expect(account.data.claimableAssets).toBe(1);
  expect(account.data.label).toBe("test-sol");
  expect(vaultBalance >= 1_000_000_000n).toBe(true);
});

test("it rejects initializing a token-only vault with a zero amount", async () => {
  const { client, authority } = await createTestContext();
  const heir = await createHeir(client);
  const { mint } = await createAndMintTokens();

  const { vault } = await deriveEstateVault(authority.address, heir.address);
  const { vaultTokenAccount, authorityTokenAccount } = await deriveTokenAccounts(
    vault,
    authority.address,
    heir.address,
    mint.address,
  );

  // we don't allow zero amt inits
  expect(
    sendInitialize(client, {
      heir,
      amount: 0n,
      label: "test-token-zero-amount",
      heartbeatInterval: 0n,
      gracePeriod: 0n,
      pauseDuration: 0n,
      mint: mint.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      vaultTokenAccount,
      authorityTokenAccount,
    }),
  ).rejects.toThrow();
});
