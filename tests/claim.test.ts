import { test } from "bun:test";
import { generateKeyPairSigner } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  createTestContext,
  createAndMintTokens,
  createHeir,
  sendInitialize,
  sendClaim,
  deriveEstateVault,
  deriveTokenAccounts,
} from "./setup";

test("it claims a native SOL vault", async () => {
  const { client } = await createTestContext();

  const { heir } = await sendInitialize(client, {
    amount: BigInt(1_000_000_000), // one sol
    label: "test-claim-sol",
    heartbeatInterval: 0n,
    gracePeriod: 0n,
    pauseDuration: 0n,
  });

  await sendClaim(client, { heir });
});

test("it claims a token vault", async () => {
  const { client, authority } = await createTestContext();
  const { mint } = await createAndMintTokens();
  const heir = await createHeir(client);

  const { vault, estate } = await deriveEstateVault(
    authority.address,
    heir.address,
  );
  const { vaultTokenAccount, authorityTokenAccount, heirTokenAccount, treasuryTokenAccount } =
    await deriveTokenAccounts(vault, authority.address, heir.address, mint.address);

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
    treasuryTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
});
